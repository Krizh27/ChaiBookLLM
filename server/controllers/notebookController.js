import db from '../../db.js';

export const getNotebooks = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notebooks:', error);
    res.status(500).json({ error: 'Failed to fetch notebooks' });
  }
};

export const getNotebookById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM notebooks WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found' });
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
    if (!name) {
      return res.status(400).json({ error: 'Notebook name is required' });
    }
    
    const result = await db.query(
      'INSERT INTO notebooks (name) VALUES ($1) RETURNING *',
      [name]
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
    
    if (!name) {
      return res.status(400).json({ error: 'Notebook name is required' });
    }
    
    const result = await db.query(
      'UPDATE notebooks SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found' });
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
    const result = await db.query('DELETE FROM notebooks WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    
    res.json({ message: 'Notebook deleted successfully' });
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
};
