import { askQuestion, askQuestionStream, generateLearningRoadmap } from '../services/ragService.js';
import db from '../../db.js';

/**
 * Retrieves past conversation history for a specific notebook.
 */
export const getHistory = async (req, res) => {
  try {
    const { notebookId } = req.params;

    // Find the primary chat session for this notebook
    const sessionResult = await db.query(
      'SELECT id FROM chat_sessions WHERE notebook_id = $1 ORDER BY created_at ASC LIMIT 1',
      [notebookId]
    );

    if (sessionResult.rows.length === 0) {
      return res.json([]); // No conversation history yet
    }

    const sessionId = sessionResult.rows[0].id;

    // Fetch chronological messages belonging to this session
    const messagesResult = await db.query(
      'SELECT role, content, citations, created_at FROM messages WHERE chat_session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    res.json(messagesResult.rows);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
};

/**
 * Handles incoming chat messages, streams RAG answers via SSE, and saves the turn in PostgreSQL.
 */
export const chat = async (req, res) => {
  try {
    const { notebookId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Get or create default chat session for this notebook
    let sessionResult = await db.query(
      'SELECT id FROM chat_sessions WHERE notebook_id = $1 ORDER BY created_at ASC LIMIT 1',
      [notebookId]
    );

    let sessionId;
    if (sessionResult.rows.length === 0) {
      const newSession = await db.query(
        'INSERT INTO chat_sessions (notebook_id) VALUES ($1) RETURNING id',
        [notebookId]
      );
      sessionId = newSession.rows[0].id;
    } else {
      sessionId = sessionResult.rows[0].id;
    }

    // 2. Save the user's incoming prompt to the messages table
    await db.query(
      'INSERT INTO messages (chat_session_id, role, content) VALUES ($1, $2, $3)',
      [sessionId, 'user', message]
    );

    // Set SSE Headers for real-time streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 3. Generate answer stream using OpenAI + Qdrant vectors
    const response = await askQuestionStream(
      notebookId, 
      message,
      (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      },
      (citations) => {
        res.write(`data: ${JSON.stringify({ type: 'metadata', citations })}\n\n`);
      }
    );

    // 4. Save the AI assistant's complete response along with citations as JSONB
    await db.query(
      'INSERT INTO messages (chat_session_id, role, content, citations) VALUES ($1, $2, $3, $4)',
      [sessionId, 'assistant', response.answer, JSON.stringify(response.citations || [])]
    );

    res.write(`data: ${JSON.stringify({ type: 'done', answer: response.answer, citations: response.citations })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error during chat generation:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate answer' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to generate answer' })}\n\n`);
      res.end();
    }
  }
};

/**
 * Handles generating a personalized learning roadmap from indexed sources.
 */
export const createRoadmap = async (req, res) => {
  try {
    const { notebookId } = req.params;
    const { topic, priorKnowledge } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'A learning target topic is required.' });
    }

    const roadmap = await generateLearningRoadmap(notebookId, topic, priorKnowledge);
    res.json(roadmap);
  } catch (error) {
    console.error('Error generating personalized learning roadmap:', error);
    res.status(500).json({ error: error.message || 'Failed to generate learning roadmap' });
  }
};
