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


/**
 * Multi-Stage Retrieval Strategy for YouTube Playlists & Documents
 * Prioritizes Video Title Matching, Chapter/Timestamp Matching, Metadata Shortlisting, and Semantic Vector Retrieval.
 */
async function executeMultiStageRetrieval(query, sources, routerSelectedIds, notebookId, queryVector, limit = 8) {
  const normQuery = query.toLowerCase().trim();
  const titleMatches = new Set();
  const chapterMatches = new Set();
  const metadataMatches = new Set();
  let prioritizedChapter = null;

  // Stage 1: Video Title Matching
  for (const src of sources) {
    const normTitle = (src.title || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const significantWords = normTitle.split(/\s+/).filter(w => w.length > 3 && !['youtube', 'video', 'tutorial', 'part', 'with', 'from', 'about', 'lecture'].includes(w));
    
    // Extract title without file extension
    const titleWithoutExt = normTitle.replace(/\s(txt|pdf|srt|vtt)$/, '').trim();
    if (titleWithoutExt.length > 3 && normQuery.includes(titleWithoutExt)) {
      titleMatches.add(src.id);
    } else if (significantWords.length > 0 && significantWords.every(w => normQuery.includes(w))) {
      titleMatches.add(src.id);
    }
  }
  if (titleMatches.size > 0) {
    console.log(`[Multi-Stage Retrieval] Stage 1 (Title Match) active: ${Array.from(titleMatches).join(', ')}`);
  }

  // Stage 2: Chapter / Timestamp Matching
  for (const src of sources) {
    const meta = typeof src.metadata === 'string' ? JSON.parse(src.metadata) : (src.metadata || {});
    const chapters = meta.chapters || [];
    for (const chap of chapters) {
      const normChap = (chap.title || '').toLowerCase().trim();
      if (normChap.length > 3 && normQuery.includes(normChap)) {
        chapterMatches.add(src.id);
        prioritizedChapter = { sourceId: src.id, title: chap.title, start: chap.start_seconds || 0, timeStr: chap.timestamp_str };
        break;
      }
    }
  }
  if (chapterMatches.size > 0) {
    console.log(`[Multi-Stage Retrieval] Stage 2 (Chapter Match) active: chapter "${prioritizedChapter.title}" in source ${prioritizedChapter.sourceId}`);
  }

  // Stage 3: Metadata Search (Shortlist candidate videos before vector search)
  const candidateIds = new Set([...titleMatches, ...chapterMatches]);
  if (candidateIds.size === 0) {
    // Filter out standard RAG stop words
    const stopWords = new Set(['how', 'what', 'does', 'should', 'could', 'would', 'about', 'their', 'there', 'where', 'detailed', 'explain', 'concepts', 'architecture', 'summarize', 'takeaways', 'primary', 'every', 'claim']);
    const queryTokens = normQuery
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    for (const src of sources) {
      const meta = typeof src.metadata === 'string' ? JSON.parse(src.metadata) : (src.metadata || {});
      let hits = 0;
      const desc = (meta.description || '').toLowerCase();
      const summary = (meta.summary || '').toLowerCase();
      const topics = (meta.main_topics || []).map(t => t.toLowerCase()).join(' ');
      const keywords = (meta.keywords || []).map(k => k.toLowerCase()).join(' ');
      const entities = (meta.named_entities || []).map(e => e.toLowerCase()).join(' ');
      const fullText = `${src.title.toLowerCase()} ${desc} ${summary} ${topics} ${keywords} ${entities}`;

      queryTokens.forEach(token => {
        if (fullText.includes(token)) hits++;
      });
      if (queryTokens.length > 0 && hits >= Math.max(1, Math.floor(queryTokens.length * 0.3))) {
        metadataMatches.add(src.id);
      }
    }
    if (metadataMatches.size > 0) {
      console.log(`[Multi-Stage Retrieval] Stage 3 (Metadata Search) active: short-listed ${metadataMatches.size} source(s)`);
      metadataMatches.forEach(id => candidateIds.add(id));
    }
  }

  // Combine our high-precision metadata shortlist with router selections for comprehensive coverage
  let finalSourceFilter = null;
  if (candidateIds.size > 0) {
    finalSourceFilter = Array.from(candidateIds);
  } else if (routerSelectedIds && routerSelectedIds.length > 0) {
    // Stage 4 Fallback: If no direct title/chapter/metadata keyword match exists, use router or notebook-wide semantic search
    finalSourceFilter = routerSelectedIds;
  }

  // Stage 4 & 5: Semantic Vector Search and Cross-Video Combination
  // Fetch relevant vector chunks across the shortlisted (or cross-video) sources
  let searchResults = await searchByNotebook(queryVector, notebookId, limit, finalSourceFilter);
  
  // If we found a direct chapter timestamp match in Stage 2, prioritize/boost vector chunks from that section
  if (prioritizedChapter) {
    searchResults.sort((a, b) => {
      const aIsChap = (a.payload.source_id === prioritizedChapter.sourceId && 
                       (a.payload.text || '').includes(prioritizedChapter.timeStr.split(':')[0] + ':')) ? 1 : 0;
      const bIsChap = (b.payload.source_id === prioritizedChapter.sourceId && 
                       (b.payload.text || '').includes(prioritizedChapter.timeStr.split(':')[0] + ':')) ? 1 : 0;
      if (aIsChap !== bIsChap) return bIsChap - aIsChap;
      return b.score - a.score;
    });
  }

  return searchResults;
}

/**
 * Unified Retrieval Pipeline reused by Chat, Study Hub Questions, Roadmaps, etc.
 */
export async function retrieveContext(notebookId, query, queryVector = null, limit = 8) {
  // 1. Fetch source summaries from PostgreSQL
  const sourcesResult = await db.query(
    "SELECT id, title, type, file_path_or_url, metadata FROM sources WHERE notebook_id = $1 AND indexing_status = 'ready'",
    [notebookId]
  );

  const sources = sourcesResult.rows;
  const sourceMap = new Map(sources.map(s => [s.id, s]));

  if (sources.length === 0) {
    return {
      searchResults: [],
      citations: [],
      routing: {
        decision: "out_of_scope",
        explanation: "There are no uploaded sources ready in this notebook yet. Please add a document or URL first!"
      }
    };
  }

  // 2. Pre-Retrieval Routing Triage
  const routing = await routeQuery(query, sources);

  // If the router determines the question combines incompatible topics or is completely out of scope, short-circuit immediately!
  if (routing.decision === 'unrelated_combination' || routing.decision === 'out_of_scope') {
    return {
      searchResults: [],
      citations: [],
      routing
    };
  }

  // 3. Embed the user query if not already embedded
  const vector = queryVector || await generateQueryEmbedding(query);

  // 4. Run Multi-Stage Retrieval Strategy: Title match -> Chapter match -> Metadata Search -> Semantic & Cross-Video Retrieval
  const searchResults = await executeMultiStageRetrieval(query, sources, routing.selected_source_ids, notebookId, vector, limit);

  // 5. Map enriched citations for frontend inspection
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

  return {
    searchResults,
    citations,
    routing
  };
}

export async function askQuestionStream(notebookId, query, onToken = null, onMetadata = null) {
  // Call unified retrieval pipeline
  const queryVector = await generateQueryEmbedding(query);
  const { searchResults, citations, routing } = await retrieveContext(notebookId, query, queryVector, 8);

  // Handle routing short-circuits
  if (routing.decision === 'unrelated_combination' || routing.decision === 'out_of_scope') {
    const text = routing.explanation || "Your question combines unrelated concepts or asks about topics not covered by this notebook's sources.";
    if (onMetadata) onMetadata([]);
    if (onToken) onToken(text);
    return {
      answer: text,
      citations: []
    };
  }

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

  if (onMetadata) onMetadata(citations);

  // Build Prompt
  const prompt = buildRagPrompt(query, searchResults);

  // Generate Response from LLM with streaming enabled
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
 * and Qdrant RAG vector retrievals via the unified retrieval pipeline.
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

  // 2. Perform Unified RAG Vector Retrieval to discover matching timestamped transcript snippets
  const query = `${topic} ${priorKnowledge}`;
  const queryVector = await generateQueryEmbedding(query);
  const { searchResults } = await retrieveContext(notebookId, query, queryVector, 15);

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
