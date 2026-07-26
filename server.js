import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, requireAuth } from '@clerk/express';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

import fs from 'fs';
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Serve static files from the client directory and uploads directory
app.use(express.static('client'));
app.use('/uploads', express.static('uploads'));

import notebookRoutes from './server/routes/notebookRoutes.js';
import sourceRoutes from './server/routes/sourceRoutes.js';
import chatRoutes from './server/routes/chatRoutes.js';
import * as chatController from './server/controllers/chatController.js';
// API Routes protected by Clerk Authentication
app.use('/api/notebooks', requireAuth(), notebookRoutes);
app.use('/api/notebooks/:notebookId/sources', requireAuth(), sourceRoutes);
app.use('/api/notebooks/:notebookId/chat', requireAuth(), chatRoutes);
app.post('/api/notebooks/:notebookId/roadmap', requireAuth(), chatController.createRoadmap);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
