import db from '../db.js';
import { deleteBySourceId } from '../server/repositories/qdrantRepo.js';

async function run() {
  const nid = '686cb9e8-2198-4e96-996e-84a86ff884d8';
  console.log('Querying sources for notebook:', nid);
  const result = await db.query('SELECT id, file_path_or_url FROM sources WHERE notebook_id = $1', [nid]);
  
  for (const row of result.rows) {
    const url = row.file_path_or_url;
    if (url.includes('youtube.com') && !url.includes('BQTaBibVbo4') && !url.includes('LkSwZilRyPI')) {
      console.log('Deleting stale source:', row.id, url);
      await db.query('DELETE FROM sources WHERE id = $1', [row.id]);
      try {
        await deleteBySourceId(row.id, nid);
        console.log('Deleted vectors from Qdrant for source:', row.id);
      } catch (e) {
        console.error('Qdrant delete error:', e.message);
      }
    }
  }
  console.log('Cleanup finished successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
