import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calls OpenAI API to generate embeddings for an array of text chunks.
 * Returns an array of Qdrant Point objects ready for insertion.
 */
export async function generateEmbeddings(chunks, notebookId, sourceId, sourceTitle) {
  const points = [];
  
  if (chunks.length === 0) return points;

  console.log(`Generating embeddings for ${chunks.length} chunks...`);
  
  // Send chunks to OpenAI
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small", 
    input: chunks,
  });

  const embeddings = response.data;

  // Build the Qdrant payloads
  for (let i = 0; i < chunks.length; i++) {
    const vector = embeddings[i].embedding;
    const text = chunks[i];
    
    points.push({
      id: uuidv4(),
      vector: vector,
      payload: {
        notebook_id: notebookId,
        source_id: sourceId,
        source_title: sourceTitle,
        chunk_index: i,
        original_text: text
      }
    });
  }
  
  return points;
}

/**
 * Generates embedding for a single query string.
 */
export async function generateQueryEmbedding(query) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  
  return response.data[0].embedding;
}
