import fs from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';
import db from '../../db.js';
import { chunkText } from '../ai/chunking.js';
import { generateEmbeddings } from '../ai/embeddings.js';
import { upsertPoints } from '../repositories/qdrantRepo.js';
import { generateSourceMetadata } from '../ai/metadata.js';

/**
 * Cleans SRT and VTT subtitle file formats into readable text for embedding and RAG processing.
 */
function cleanSubtitleText(rawContent) {
  return rawContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false; // empty line
      if (line.startsWith('WEBVTT') || line.startsWith('NOTE')) return false;
      if (line.includes('-->')) return false; // timestamp line
      if (/^\d+$/.test(line)) return false; // index sequence number in SRT
      return true;
    })
    .join(' ')
    .replace(/<[^>]*>/g, '') // strip HTML styling tags like <i>, </i>, <font>
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Processes an uploaded source: extracts text, chunks it, embeds it, and stores it.
 */
export async function processSource(notebookId, sourceId) {
  try {
    // 1. Update status to processing
    await db.query(
      'UPDATE sources SET indexing_status = $1 WHERE id = $2 AND notebook_id = $3',
      ['processing', sourceId, notebookId]
    );

    // 2. Fetch source details
    const result = await db.query('SELECT * FROM sources WHERE id = $1', [sourceId]);
    const source = result.rows[0];
    
    if (!source) throw new Error('Source not found during processing');

    // 3. Extract text
    let rawText = '';
    const filePath = source.file_path_or_url;
    
    if (source.type === 'text') {
      rawText = await fs.readFile(filePath, 'utf-8');
    } else if (source.type === 'subtitle' || filePath.endsWith('.srt') || filePath.endsWith('.vtt')) {
      const content = await fs.readFile(filePath, 'utf-8');
      rawText = cleanSubtitleText(content);
    } else if (source.type === 'pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdf(dataBuffer);
      rawText = pdfData.text;
    } else if (source.type === 'url') {
      const response = await fetch(filePath);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const title = $('title').text() || filePath;
      await db.query('UPDATE sources SET title = $1 WHERE id = $2', [title, sourceId]);
      source.title = title;

      $('script, style, nav, footer, header').remove();
      rawText = $('body').text().replace(/\s+/g, ' ').trim();
    } else if (source.type === 'youtube') {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(filePath);
        // Annotate transcript chunks with accurate timestamps (offset in ms) for exact video playback navigation
        rawText = transcript.map((t, i) => {
          const totalSecs = Math.floor((t.offset || 0) / 1000);
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          const timeFormat = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
          // Add timestamp marker periodically or on every segment
          return `[Timestamp ${timeFormat} | ${totalSecs}s] ${t.text}`;
        }).join(' ');
      } catch (err) {
        throw new Error('Failed to fetch YouTube transcript. Ensure the video has closed captions.');
      }
    } else {
      throw new Error(`Unsupported file type: ${source.type}`);
    }

    // 4. Generate lightweight AI metadata summary and save to PostgreSQL
    console.log(`Generating AI summary metadata for source: ${source.title}...`);
    const metadata = await generateSourceMetadata(source.title, rawText);
    await db.query(
      'UPDATE sources SET metadata = $1 WHERE id = $2 AND notebook_id = $3',
      [JSON.stringify(metadata), sourceId, notebookId]
    );

    // 5. Chunk text
    console.log(`Chunking text for source: ${source.title}...`);
    const chunks = await chunkText(rawText);
    console.log(`Created ${chunks.length} chunks.`);

    // 5. Vector Storage Integration (Milestone 7)
    const points = await generateEmbeddings(chunks, notebookId, sourceId, source.title);
    if (points.length > 0) {
      console.log(`Storing ${points.length} vectors in Qdrant...`);
      await upsertPoints(points);
    }

    // 6. Update status to ready
    await db.query(
      'UPDATE sources SET indexing_status = $1 WHERE id = $2 AND notebook_id = $3',
      ['ready', sourceId, notebookId]
    );

    console.log(`Source ${sourceId} indexed successfully.`);
  } catch (error) {
    console.error(`Error processing source ${sourceId}:`, error);
    
    // Update status to error
    await db.query(
      'UPDATE sources SET indexing_status = $1, error_message = $2 WHERE id = $3 AND notebook_id = $4',
      ['error', error.message, sourceId, notebookId]
    );
  }
}
