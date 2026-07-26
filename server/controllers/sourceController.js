import fs from 'fs';
import db from '../../db.js';
import { processSource } from '../services/indexingService.js';
import { deleteBySourceId } from '../repositories/qdrantRepo.js';

export const getSources = async (req, res) => {
  try {
    const { notebookId } = req.params;
    const result = await db.query(
      'SELECT * FROM sources WHERE notebook_id = $1 ORDER BY created_at DESC',
      [notebookId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
};

export const uploadSource = async (req, res) => {
  try {
    const { notebookId } = req.params;
    const file = req.file;
    const url = req.body.url;

    if (!file && !url) {
      return res.status(400).json({ error: 'No file or URL provided' });
    }

    // Verify parent notebook exists in PostgreSQL before attaching a source
    const notebookCheck = await db.query('SELECT id FROM notebooks WHERE id = $1', [notebookId]);
    if (notebookCheck.rows.length === 0) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path); // Clean up orphaned uploaded file from disk
      }
      return res.status(404).json({ error: 'Notebook not found' });
    }

    let type = 'text';
    let title = '';
    let pathOrUrl = '';

    if (file) {
      const extension = file.originalname.toLowerCase();
      if (!extension.endsWith('.pdf') && !extension.endsWith('.txt') && !extension.endsWith('.srt') && !extension.endsWith('.vtt')) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path); // Remove unsupported file from disk
        }
        return res.status(400).json({ error: 'Only .txt, .pdf, .srt, and .vtt files are currently supported' });
      }

      if (extension.endsWith('.pdf')) {
        type = 'pdf';
      } else if (extension.endsWith('.srt') || extension.endsWith('.vtt')) {
        type = 'subtitle';
      } else {
        type = 'text';
      }
      title = file.originalname;
      pathOrUrl = file.path;
    } else if (url) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        type = 'youtube';
      } else {
        type = 'url';
      }
      title = url; // Will be updated during indexing
      pathOrUrl = url;
    }

    // Insert into database with status pending
    const result = await db.query(
      `INSERT INTO sources (notebook_id, type, title, file_path_or_url, indexing_status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [notebookId, type, title, pathOrUrl, 'pending']
    );

    const source = result.rows[0];

    // Trigger the async indexing pipeline (fire-and-forget)
    processSource(notebookId, source.id).catch(err => {
      console.error('Unhandled error in processSource:', err);
    });
    
    res.status(202).json(source); // 202 Accepted
  } catch (error) {
    console.error('Error uploading source:', error);
    res.status(500).json({ error: 'Failed to upload source' });
  }
};

export const deleteSource = async (req, res) => {
  try {
    const { notebookId, sourceId } = req.params;
    const result = await db.query(
      'DELETE FROM sources WHERE id = $1 AND notebook_id = $2 RETURNING *',
      [sourceId, notebookId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    // Delete from Qdrant asynchronously
    deleteBySourceId(sourceId, notebookId).catch(err => {
      console.error('Failed to delete vectors from Qdrant:', err);
    });

    res.json({ message: 'Source deleted successfully' });
  } catch (error) {
    console.error('Error deleting source:', error);
    res.status(500).json({ error: 'Failed to delete source' });
  }
};

export const reindexSource = async (req, res) => {
  try {
    const { notebookId, sourceId } = req.params;
    
    // Verify source exists in PostgreSQL
    const result = await db.query(
      'SELECT * FROM sources WHERE id = $1 AND notebook_id = $2',
      [sourceId, notebookId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    // Clear existing vector points from Qdrant to avoid duplicate chunks
    await deleteBySourceId(sourceId, notebookId).catch(err => {
      console.error('Failed to delete old vectors during reindex:', err);
    });

    // Reset database indexing status to pending
    const updateResult = await db.query(
      'UPDATE sources SET indexing_status = $1, error_message = $2 WHERE id = $3 AND notebook_id = $4 RETURNING *',
      ['pending', null, sourceId, notebookId]
    );

    // Trigger async extraction and embedding pipeline
    processSource(notebookId, sourceId).catch(err => {
      console.error('Unhandled error in reindex processSource:', err);
    });

    res.status(202).json(updateResult.rows[0]);
  } catch (error) {
    console.error('Error re-indexing source:', error);
    res.status(500).json({ error: 'Failed to re-index source' });
  }
};
