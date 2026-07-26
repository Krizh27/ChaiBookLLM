import db from '../../db.js';

export const getNotebooks = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const result = await db.query(
      'SELECT * FROM notebooks WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC',
      [userId || null]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notebooks:', error);
    res.status(500).json({ error: 'Failed to fetch notebooks' });
  }
};

export const getNotebookById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;
    const result = await db.query(
      'SELECT * FROM notebooks WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [id, userId || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching notebook:', error);
    res.status(500).json({ error: 'Failed to fetch notebook' });
  }
};

export const createNotebook = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.auth?.userId;
    if (!name) {
      return res.status(400).json({ error: 'Notebook name is required' });
    }
    
    const result = await db.query(
      'INSERT INTO notebooks (name, user_id) VALUES ($1, $2) RETURNING *',
      [name, userId || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating notebook:', error);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
};

export const updateNotebook = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.auth?.userId;
    
    if (!name) {
      return res.status(400).json({ error: 'Notebook name is required' });
    }
    
    const result = await db.query(
      'UPDATE notebooks SET name = $1 WHERE id = $2 AND (user_id = $3 OR user_id IS NULL) RETURNING *',
      [name, id, userId || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notebook:', error);
    res.status(500).json({ error: 'Failed to update notebook' });
  }
};

export const deleteNotebook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;
    const result = await db.query(
      'DELETE FROM notebooks WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING *',
      [id, userId || null]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found or access denied' });
    }
    
    res.json({ message: 'Notebook deleted successfully' });
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
};
