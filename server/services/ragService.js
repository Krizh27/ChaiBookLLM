import { generateQueryEmbedding } from '../ai/embeddings.js';
import { searchByNotebook } from '../repositories/qdrantRepo.js';
import { buildRagPrompt } from '../ai/prompts.js';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askQuestion(notebookId, query) {
  // 1. Embed the query
  const queryVector = await generateQueryEmbedding(query);

  // 2. Search Qdrant, strictly filtering by notebookId
  const searchResults = await searchByNotebook(queryVector, notebookId, 5);

  // If no context found
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

  // 5. Map citations for the frontend
  const citations = searchResults.map((result, index) => ({
    citation_id: index + 1,
    source_id: result.payload.source_id,
    source_title: result.payload.source_title,
    text_snippet: result.payload.original_text
  }));

  return {
    answer,
    citations
  };
}
