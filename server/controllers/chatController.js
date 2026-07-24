import { askQuestion } from '../services/ragService.js';

export const chat = async (req, res) => {
  try {
    const { notebookId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await askQuestion(notebookId, message);

    res.json(response);
  } catch (error) {
    console.error('Error during chat generation:', error);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
};
