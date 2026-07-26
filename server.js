import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the client directory and uploads directory
app.use(express.static('client'));
app.use('/uploads', express.static('uploads'));

import notebookRoutes from './server/routes/notebookRoutes.js';
import sourceRoutes from './server/routes/sourceRoutes.js';
import chatRoutes from './server/routes/chatRoutes.js';
// API Routes
app.use('/api/notebooks', notebookRoutes);
app.use('/api/notebooks/:notebookId/sources', sourceRoutes);
app.use('/api/notebooks/:notebookId/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
