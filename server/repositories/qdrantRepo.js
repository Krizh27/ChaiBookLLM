import { QdrantClient } from '@qdrant/js-client-rest';
import 'dotenv/config';

export const COLLECTION_NAME = 'bookllm_collection';

export const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

/**
 * Ensures the main collection exists before doing operations.
 */
async function ensureCollection() {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (!exists) {
      console.log(`Creating Qdrant collection: ${COLLECTION_NAME}`);
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536, // OpenAI text-embedding-3-small size
          distance: 'Cosine',
        },
      });
      console.log('Collection created successfully.');
    }
  } catch (error) {
    console.error('Error ensuring Qdrant collection:', error);
    // Don't throw here if we are just ensuring it, let operations fail if it really doesn't exist
  }
}

/**
 * Upserts a batch of points to Qdrant.
 */
export async function upsertPoints(points) {
  await ensureCollection();
  
  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: points,
  });
}

/**
 * Searches Qdrant for similar vectors, strictly filtered by notebook_id.
 */
export async function searchByNotebook(vector, notebookId, limit = 5) {
  await ensureCollection();
  
  const results = await client.search(COLLECTION_NAME, {
    vector: vector,
    limit: limit,
    filter: {
      must: [
        {
          key: 'notebook_id',
          match: {
            value: notebookId
          }
        }
      ]
    },
    with_payload: true
  });
  
  return results;
}

/**
 * Deletes all points belonging to a specific source in a notebook.
 */
export async function deleteBySourceId(sourceId, notebookId) {
  await ensureCollection();
  
  await client.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [
        {
          key: 'source_id',
          match: {
            value: sourceId
          }
        },
        {
          key: 'notebook_id',
          match: {
            value: notebookId
          }
        }
      ]
    }
  });
}
