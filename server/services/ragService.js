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

export async function askQuestion(notebookId, query) {
  // 1. Pre-Retrieval Routing Triage: Fetch source summaries from PostgreSQL
  const sourcesResult = await db.query(
    "SELECT id, title, type, file_path_or_url, metadata FROM sources WHERE notebook_id = $1 AND indexing_status = 'ready'",
    [notebookId]
  );

  const sourceMap = new Map(sourcesResult.rows.map(s => [s.id, s]));
  const routing = await routeQuery(query, sourcesResult.rows);

  // If the router determines the question combines incompatible topics or is completely out of scope, short-circuit immediately!
  if (routing.decision === 'unrelated_combination' || routing.decision === 'out_of_scope') {
    return {
      answer: routing.explanation || "Your question combines unrelated concepts or asks about topics not covered by this notebook's sources.",
      citations: []
    };
  }

  // 2. Embed the user query
  const queryVector = await generateQueryEmbedding(query);

  // 3. Search Qdrant, restricting search exclusively to the selected source IDs
  const searchResults = await searchByNotebook(queryVector, notebookId, 5, routing.selected_source_ids);

  // If no context found in the selected sources
  if (searchResults.length === 0) {
    return {
      answer: "I couldn't find any relevant information in this notebook's sources.",
      citations: []
    };
  }

  // 3. Build Prompt
  const prompt = buildRagPrompt(query, searchResults);

  // 4. Generate Response from LLM
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: prompt }
    ],
  });

  const answer = completion.choices[0].message.content;

  // 5. Map enriched citations for the frontend Source Viewer
  const citations = searchResults.map((result, index) => {
    const srcData = sourceMap.get(result.payload.source_id) || {};
    let urlOrPath = srcData.file_path_or_url || '';
    if (urlOrPath && !urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
      // Normalize Windows backslashes and prepend web slash for static serving
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
    answer,
    citations
  };
}
