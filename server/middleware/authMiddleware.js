import db from '../../db.js';
import { getAuth } from '@clerk/express';

/**
 * Middleware to verify that the requesting user owns the notebook specified in req.params.notebookId or req.params.id.
 */
export const requireNotebookOwner = async (req, res, next) => {
  const auth = getAuth(req);
  const userId = auth?.userId || req.auth?.userId;
  const notebookId = req.params.notebookId || req.params.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  if (!notebookId) {
    return res.status(400).json({ error: 'Notebook ID is required' });
  }

  try {
    const result = await db.query(
      'SELECT id, user_id FROM notebooks WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [notebookId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found or access denied' });
    }

    if (!result.rows[0].user_id) {
      await db.query(
        'UPDATE notebooks SET user_id = $1 WHERE id = $2 AND user_id IS NULL',
        [userId, notebookId]
      );
    }

    next();
  } catch (error) {
    console.error('Error verifying notebook ownership:', error);
    res.status(500).json({ error: 'Internal server error during authorization check' });
  }
};
