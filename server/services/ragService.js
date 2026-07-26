import { generateQueryEmbedding } from '../ai/embeddings.js';
import { searchByNotebook } from '../repositories/qdrantRepo.js';
import { buildRagPrompt } from '../ai/prompts.js';
import { routeQuery } from '../ai/metadata.js';
import db from '../../db.js';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askQuestionStream(notebookId, query, onToken = null, onMetadata = null) {
  // 1. Pre-Retrieval Routing Triage: Fetch source summaries from PostgreSQL
  const sourcesResult = await db.query(
    "SELECT id, title, type, file_path_or_url, metadata FROM sources WHERE notebook_id = $1 AND indexing_status = 'ready'",
    [notebookId]
  );

  const sourceMap = new Map(sourcesResult.rows.map(s => [s.id, s]));
  const routing = await routeQuery(query, sourcesResult.rows);

  // If the router determines the question combines incompatible topics or is completely out of scope, short-circuit immediately!
  if (routing.decision === 'unrelated_combination' || routing.decision === 'out_of_scope') {
    const text = routing.explanation || "Your question combines unrelated concepts or asks about topics not covered by this notebook's sources.";
    if (onMetadata) onMetadata([]);
    if (onToken) onToken(text);
    return {
      answer: text,
      citations: []
    };
  }

  // 2. Embed the user query
  const queryVector = await generateQueryEmbedding(query);

  // 3. Search Qdrant, restricting search exclusively to the selected source IDs
  const searchResults = await searchByNotebook(queryVector, notebookId, 5, routing.selected_source_ids);

  // If no context found in the selected sources
  if (searchResults.length === 0) {
    const noCtxMsg = "I couldn't find any relevant information in this notebook's sources.";
    if (onMetadata) onMetadata([]);
    if (onToken) onToken(noCtxMsg);
    return {
      answer: noCtxMsg,
      citations: []
    };
  }

  // 4. Map enriched citations for frontend inspection
  const citations = searchResults.map((result, index) => {
    const srcData = sourceMap.get(result.payload.source_id) || {};
    let urlOrPath = srcData.file_path_or_url || '';
    if (urlOrPath && !urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
      urlOrPath = '/' + urlOrPath.replace(/\\/g, '/').replace(/^\/?/, '');
    }

    return {
      citation_id: index + 1,
      source_id: result.payload.source_id,
      source_title: result.payload.source_title,
      source_type: srcData.type || 'text',
      url_or_path: urlOrPath,
      chunk_index: result.payload.chunk_index || 0,
      text_snippet: result.payload.original_text
    };
  });

  if (onMetadata) onMetadata(citations);

  // 5. Build Prompt
  const prompt = buildRagPrompt(query, searchResults);

  // 6. Generate Response from LLM with streaming enabled
  const stream = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: prompt }
    ],
    stream: true,
  });

  let answer = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    if (token) {
      answer += token;
      if (onToken) onToken(token);
    }
  }

  return {
    answer,
    citations
  };
}

export async function askQuestion(notebookId, query) {
  return askQuestionStream(notebookId, query, null, null);
}

/**
 * Generates a personalized learning roadmap using existing PostgreSQL source metadata
 * and Qdrant RAG vector retrievals without needing a separate AI pipeline.
 */
export async function generateLearningRoadmap(notebookId, topic, priorKnowledge = "") {
  // 1. Retrieve all indexed sources and their pre-computed AI metadata from PostgreSQL
  const sourcesResult = await db.query(
    "SELECT id, title, type, file_path_or_url, metadata FROM sources WHERE notebook_id = $1 AND indexing_status = 'ready'",
    [notebookId]
  );

  if (sourcesResult.rows.length === 0) {
    throw new Error("No indexed sources found in this notebook. Please upload YouTube videos or documents first!");
  }

  // 2. Perform RAG Vector Retrieval to discover matching timestamped transcript snippets in Qdrant
  const queryVector = await generateQueryEmbedding(`${topic} ${priorKnowledge}`);
  const searchResults = await searchByNotebook(queryVector, notebookId, 15, sourcesResult.rows.map(s => s.id));

  // 3. Assemble a structured source catalog with Qdrant snippets and timestamps
  let sourceCatalogText = "";
  sourcesResult.rows.forEach((s) => {
    const meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : (s.metadata || {});
    const matchingChunks = searchResults.filter(r => r.payload.source_id === s.id).map(r => r.payload.original_text).slice(0, 3);
    sourceCatalogText += `[Source ID: ${s.id}]
Title: ${s.title}
Type: ${s.type}
URL or Path: ${s.file_path_or_url}
AI Summary: ${meta.summary || 'N/A'}
Topics Covered: ${(meta.main_topics || []).join(', ')}
Retrieved Transcript & Timestamp Snippets:
${matchingChunks.join("\n---\n") || "No immediate text chunk match."}\n\n`;
  });

  // 4. Synthesize the personalized roadmap using OpenAI JSON formatting
  const systemPrompt = `You are an expert curriculum architect and AI tutor.
Your task is to analyze the user's desired learning topic and existing knowledge against the catalog of uploaded video lectures and sources, generating a comprehensive, step-by-step personalized learning roadmap in strict JSON format.

CRITICAL INSTRUCTIONS:
1. ONLY use the provided uploaded sources in your roadmap. Do not hallucinate external videos or links.
2. Tailor the roadmap to the user's existing knowledge ("${priorKnowledge || 'Beginner with zero background'}"). If the user already knows beginner topics, skip basic introductions and focus on intermediate/advanced progression.
3. If multiple videos in the catalog explain the same topic, recommend the single MOST SUITABLE video and explain WHY in "why_recommended" (e.g. better depth, clearer practical examples, or better suited to user's skill level).
4. Extract or accurately estimate the video timestamp offset (in seconds and display string like "02:15") from the retrieved snippets or start at "00:00" (0s) if covering from the beginning.

Required JSON Schema:
{
  "title": "Personalized Learning Roadmap for: ${topic}",
  "summary": "Brief explanation of how this path accommodates what you already know and guides you to mastery.",
  "steps": [
    {
      "step_number": 1,
      "topic": "Specific Sub-topic Name",
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "explanation": "Short 2-sentence intuitive breakdown of this core concept.",
      "recommended_video_title": "Title of best matching uploaded source",
      "source_id": "UUID of the source from catalog",
      "video_url": "Exact file_path_or_url of the source",
      "timestamp_str": "00:00 or MM:SS",
      "timestamp_seconds": 0,
      "estimated_duration": "~15 minutes",
      "why_recommended": "Clear rationale why this specific video/section is ideal for this topic and skill level.",
      "prerequisites": ["Concept A", "Concept B"]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Target Topic: "${topic}"\nPrior Knowledge: "${priorKnowledge || 'None'}"\n\nUploaded Sources & Transcript Catalog:\n${sourceCatalogText}` }
    ],
    temperature: 0.2,
  });

  return JSON.parse(completion.choices[0].message.content);
}
