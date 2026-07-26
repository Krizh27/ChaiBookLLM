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
    const userId = req.auth?.userId;
    const notebookCheck = await db.query('SELECT id FROM notebooks WHERE id = $1 AND user_id = $2', [notebookId, userId]);
    if (notebookCheck.rows.length === 0) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path); // Clean up orphaned uploaded file from disk
      }
      return res.status(404).json({ error: 'Notebook not found or access denied' });
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
      // Support YouTube Playlists and multiple comma-separated URLs
      let urlsToProcess = [url.trim()];
      if (url.includes('youtube.com/playlist') || url.includes('&list=')) {
        try {
          let playlistId = '';
          if (url.includes('list=')) {
            const listParam = url.split('list=')[1];
            playlistId = listParam ? listParam.split('&')[0] : '';
          }

          const resp = await fetch(url);
          const html = await resp.text();
          
          let videoIds = [];
          if (playlistId) {
            const watchRegex = /watch\?v=([a-zA-Z0-9_-]{11})/g;
            let match;
            const escapedPlaylistId = playlistId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
            const listRegex = new RegExp(`list(?:=|\\\\u003d|%3D)${escapedPlaylistId}`, 'i');

            while ((match = watchRegex.exec(html)) !== null) {
              const startIdx = match.index;
              const endIdx = watchRegex.lastIndex;
              
              // Inspect a 300 character window surrounding the matched link to verify playlist membership
              const windowStart = Math.max(0, startIdx - 100);
              const windowEnd = Math.min(html.length, endIdx + 200);
              const windowText = html.slice(windowStart, windowEnd);
              
              if (listRegex.test(windowText)) {
                videoIds.push(match[1]);
              }
            }
          }

          const uniqueIds = [...new Set(videoIds)];
          if (uniqueIds.length > 0) {
            urlsToProcess = uniqueIds.slice(0, 15).map(id => `https://www.youtube.com/watch?v=${id}`);
          }
        } catch (e) {
          console.warn('Failed to parse playlist URL, processing as single link:', e.message);
        }
      } else if (url.includes(',')) {
        urlsToProcess = url.split(',').map(u => u.trim()).filter(Boolean);
      }

      let primarySource = null;
      for (const singleUrl of urlsToProcess) {
        const urlType = (singleUrl.includes('youtube.com') || singleUrl.includes('youtu.be')) ? 'youtube' : 'url';
        
        // Prevent duplicate source records within the current notebook
        const checkResult = await db.query(
          'SELECT * FROM sources WHERE notebook_id = $1 AND file_path_or_url = $2',
          [notebookId, singleUrl]
        );

        let sourceRow;
        if (checkResult.rows.length > 0) {
          sourceRow = checkResult.rows[0];
        } else {
          const result = await db.query(
            `INSERT INTO sources (notebook_id, type, title, file_path_or_url, indexing_status) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [notebookId, urlType, singleUrl, singleUrl, 'pending']
          );
          sourceRow = result.rows[0];
          
          // Trigger async indexing pipeline (fire-and-forget)
          processSource(notebookId, sourceRow.id).catch(err => {
            console.error('Unhandled error in processSource:', err);
          });
        }

        if (!primarySource) primarySource = sourceRow;
      }

      return res.status(202).json(primarySource || { error: 'No valid URL found' });
    }

    // Insert file upload source into database with status pending
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
