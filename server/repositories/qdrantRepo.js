import { QdrantClient } from '@qdrant/js-client-rest';
import 'dotenv/config';

export const COLLECTION_NAME = 'bookllm_collection';

export const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

let collectionInitialized = false;

/**
 * Ensures the main collection and required payload indexes exist before operations.
 */
async function ensureCollection() {
  if (collectionInitialized) return;
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

    // Qdrant Cloud requires explicit payload indexing when filtering by attributes
    try {
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'notebook_id',
        field_schema: 'keyword',
        wait: true,
      });
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'source_id',
        field_schema: 'keyword',
        wait: true,
      });
      console.log('Verified Qdrant payload indexes for notebook_id and source_id.');
    } catch (indexError) {
      // Index likely already exists or another harmless warning
      console.log('Payload index verification note:', indexError.message || 'Already indexed');
    }

    collectionInitialized = true;
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
 * Searches Qdrant for similar vectors, strictly filtered by notebook_id and optionally restricted to specific source IDs.
 */
export async function searchByNotebook(vector, notebookId, limit = 5, selectedSourceIds = null) {
  await ensureCollection();
  
  const mustFilters = [
    {
      key: 'notebook_id',
      match: {
        value: notebookId
      }
    }
  ];

  // If specific source IDs were selected by the pre-retrieval routing layer, restrict vector search strictly to those sources
  if (Array.isArray(selectedSourceIds) && selectedSourceIds.length > 0) {
    mustFilters.push({
      key: 'source_id',
      match: {
        any: selectedSourceIds
      }
    });
  }

  const results = await client.search(COLLECTION_NAME, {
    vector: vector,
    limit: limit,
    filter: {
      must: mustFilters
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
