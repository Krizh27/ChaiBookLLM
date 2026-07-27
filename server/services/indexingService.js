import fs from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
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
  const startTime = Date.now();
  const steps = [
    { name: 'Uploading Source', status: 'completed' },
    { name: 'Validating Source', status: 'completed' },
    { name: 'Extracting Content', status: 'processing' },
    { name: 'Detecting Captions', status: 'pending' },
    { name: 'Downloading Transcript', status: 'pending' },
    { name: 'Chunking Text', status: 'pending' },
    { name: 'Generating Vector Embeddings', status: 'pending' },
    { name: 'Uploading to Qdrant', status: 'pending' }
  ];

  const updateStep = (name, status) => {
    const s = steps.find(x => x.name === name);
    if (s) s.status = status;
  };

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
    let transcriptStatus = 'not_applicable';
    let transcriptLanguage = 'none';
    let captionType = 'none';
    let hasTimestamps = false;
    let hasChapters = false;
    const filePath = source.file_path_or_url;
    
    updateStep('Extracting Content', 'processing');

    if (source.type === 'text') {
      rawText = await fs.readFile(filePath, 'utf-8');
      updateStep('Extracting Content', 'completed');
      updateStep('Detecting Captions', 'not_applicable');
      updateStep('Downloading Transcript', 'not_applicable');
    } else if (source.type === 'subtitle' || filePath.endsWith('.srt') || filePath.endsWith('.vtt')) {
      const content = await fs.readFile(filePath, 'utf-8');
      rawText = cleanSubtitleText(content);
      hasTimestamps = true;
      transcriptStatus = 'extracted';
      captionType = 'manual';
      updateStep('Extracting Content', 'completed');
      updateStep('Detecting Captions', 'completed');
      updateStep('Downloading Transcript', 'completed');
    } else if (source.type === 'pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const parsed = await parser.getText();
      rawText = parsed?.pages?.map(p => p.text).join('\n\n') || JSON.stringify(parsed) || '';
      if (!rawText.trim()) throw new Error('No readable text found in PDF. The file may be a scanned image-only document.');
      updateStep('Extracting Content', 'completed');
      updateStep('Detecting Captions', 'not_applicable');
      updateStep('Downloading Transcript', 'not_applicable');
    } else if (source.type === 'url') {
      const response = await fetch(filePath);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const title = $('title').text() || filePath;
      await db.query('UPDATE sources SET title = $1 WHERE id = $2', [title, sourceId]);
      source.title = title;

      $('script, style, nav, footer, header').remove();
      rawText = $('body').text().replace(/\s+/g, ' ').trim();
      updateStep('Extracting Content', 'completed');
      updateStep('Detecting Captions', 'not_applicable');
      updateStep('Downloading Transcript', 'not_applicable');
    } else if (source.type === 'youtube') {
      try {
        const matchId = filePath.match(/(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/);
        const videoId = matchId ? matchId[1] : filePath;
        const browserHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://www.youtube.com/'
        };

        const pipedMirrors = [
          'https://pipedapi.kdrir.in',
          'https://api.piped.privacy.dev',
          'https://pipedapi.projectsegfau.lt'
        ];

        let mirrorData = null;
        let htmlContent = '';

        // 1. Scrape YouTube page for metadata, description & chapters
        try {
          const ytResp = await fetch(filePath, { headers: browserHeaders });
          if (ytResp.ok) {
            htmlContent = await ytResp.text();
            const $yt = cheerio.load(htmlContent);
            const ytTitle = ($yt('meta[property="og:title"]').attr('content') || $yt('title').text() || '')
              .replace(/ - YouTube$/, '')
              .replace(/^YouTube$/, '')
              .trim();
            if (ytTitle && ytTitle.length > 2 && ytTitle !== filePath && !ytTitle.startsWith('http')) {
              await db.query('UPDATE sources SET title = $1 WHERE id = $2', [ytTitle, sourceId]);
              source.title = ytTitle;
            }
            const scrapedDesc = $yt('meta[property="og:description"]').attr('content') || $yt('meta[name="description"]').attr('content') || '';
            if (scrapedDesc && !scrapedDesc.includes('Enjoy the videos and music you love')) {
              source.youtubeDescription = scrapedDesc;
            }
          }
        } catch (scrapeErr) {
          console.warn('YouTube scrape warning:', scrapeErr.message);
        }

        // Parse chapter timestamps
        source.chapters = [];
        const chapRegex = /(?:^|\s|\n)(\d{1,2}:\d{2}(?::\d{2})?)\s+([A-Za-z0-9\s,.:()&'"?-]{3,60})(?=\n|$|\d{1,2}:\d{2})/g;
        let match;
        while ((match = chapRegex.exec(source.youtubeDescription || '')) !== null) {
          const timeStr = match[1].trim();
          const chapTitle = match[2].trim().replace(/\s+/g, ' ');
          const parts = timeStr.split(':').map(Number);
          let secs = 0;
          if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
          else if (parts.length === 2) secs = parts[0] * 60 + parts[1];
          if (chapTitle && chapTitle.length > 2) {
            source.chapters.push({ title: chapTitle, timestamp_str: timeStr, start_seconds: secs });
          }
        }
        hasChapters = source.chapters.length > 0;

        updateStep('Detecting Captions', 'processing');

        // Multi-Tier Transcript Extraction
        // Tier A: youtube-transcript
        const preferredLangs = ['en', 'en-US', 'en-GB', 'en-IN', 'hi'];
        let rawTranscriptList = null;

        try {
          rawTranscriptList = await YoutubeTranscript.fetchTranscript(videoId);
          if (rawTranscriptList && rawTranscriptList.length > 0) {
            transcriptLanguage = rawTranscriptList[0]?.lang || 'en';
          }
        } catch (eA) {
          for (const lang of preferredLangs) {
            try {
              const res = await YoutubeTranscript.fetchTranscript(videoId, { lang });
              if (res && res.length > 0) {
                rawTranscriptList = res;
                transcriptLanguage = lang;
                break;
              }
            } catch (eL) {}
          }
        }

        if (rawTranscriptList && rawTranscriptList.length > 0) {
          updateStep('Detecting Captions', 'completed');
          updateStep('Downloading Transcript', 'processing');
          rawText = rawTranscriptList.map(t => {
            const totalSecs = Math.floor((t.offset || 0) / 1000);
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            const timeFormat = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            const cleanT = (t.text || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n/g, ' ').trim();
            return `[Timestamp ${timeFormat} | ${totalSecs}s] ${cleanT}`;
          }).join(' ');

          transcriptStatus = 'extracted';
          captionType = 'auto_generated';
          hasTimestamps = true;
          updateStep('Downloading Transcript', 'completed');
        }

        // Tier B: Direct captionTrack XML scrape if Tier A yielded no transcript
        if (!rawText.trim() && htmlContent) {
          try {
            const idx = htmlContent.indexOf('ytInitialPlayerResponse');
            if (idx !== -1) {
              const start = htmlContent.indexOf('{', idx);
              let depth = 0;
              let end = start;
              for (let i = start; i < htmlContent.length; i++) {
                if (htmlContent[i] === '{') depth++;
                else if (htmlContent[i] === '}') depth--;
                if (depth === 0) { end = i + 1; break; }
              }
              const playerResponse = JSON.parse(htmlContent.slice(start, end));
              const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
              if (captionTracks && captionTracks.length > 0) {
                const track = captionTracks.find(t => t.languageCode?.startsWith('en') && !t.kind) ||
                              captionTracks.find(t => t.languageCode?.startsWith('en')) ||
                              captionTracks.find(t => t.languageCode?.startsWith('hi')) ||
                              captionTracks[0];
                if (track && track.baseUrl) {
                  const xmlResp = await fetch(track.baseUrl, { headers: browserHeaders });
                  const xmlText = await xmlResp.text();
                  const textMatches = [...xmlText.matchAll(/<text start="([^"]+)" (?:dur="([^"]+)" )?[^>]*>([\s\S]*?)<\/text>/g)];
                  if (textMatches.length > 0) {
                    const snippets = textMatches.map(m => {
                      const totalSecs = Math.floor(parseFloat(m[1]));
                      const mins = Math.floor(totalSecs / 60);
                      const secs = totalSecs % 60;
                      const timeFormat = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                      const rawTxt = m[3].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n/g, ' ').trim();
                      return `[Timestamp ${timeFormat} | ${totalSecs}s] ${rawTxt}`;
                    });
                    rawText = snippets.join(' ');
                    transcriptStatus = 'extracted';
                    transcriptLanguage = track.languageCode || 'en';
                    captionType = track.kind === 'asr' ? 'auto_generated' : 'manual';
                    hasTimestamps = true;
                    updateStep('Detecting Captions', 'completed');
                    updateStep('Downloading Transcript', 'completed');
                  }
                }
              }
            }
          } catch (eB) {
            console.warn('Tier B caption scrape failed:', eB.message);
          }
        }

        // Tier C / Metadata Fallback: Closed captions unavailable on YouTube
        if (!rawText.trim()) {
          transcriptStatus = 'unavailable';
          transcriptLanguage = 'none';
          captionType = 'none';
          hasTimestamps = false;
          updateStep('Detecting Captions', 'completed');
          updateStep('Downloading Transcript', 'failed');

          console.warn(`No closed captions available on YouTube for video ${videoId}. Indexing video metadata cleanly.`);
          const cleanTitle = (source.title && !source.title.startsWith('http') && source.title !== ' - YouTube') ? source.title : 'YouTube Video';
          let chaptersSummary = (source.chapters || []).map(c => `[Timestamp ${c.timestamp_str} | ${c.start_seconds}s] Chapter Topic: ${c.title}`).join('\n');
          
          rawText = `[YouTube Video Source: ${cleanTitle}]
Title: ${cleanTitle}
Video URL: ${source.file_path_or_url}
Video ID: ${videoId}
Description: ${source.youtubeDescription || 'YouTube Video: ' + cleanTitle}
${chaptersSummary ? 'Chapter Breakdown:\n' + chaptersSummary + '\n' : ''}
Overview Summary: This source is a YouTube video titled "${cleanTitle}". Closed captions were not provided by the uploader on YouTube for this video.`;
        }

        updateStep('Extracting Content', 'completed');
      } catch (err) {
        throw new Error(`YouTube ingestion error: ${err.message}`);
      }
    } else {
      throw new Error(`Unsupported file type: ${source.type}`);
    }

    // 4. Generate AI summary metadata
    console.log(`Generating AI summary metadata for source: ${source.title}...`);
    const metadata = await generateSourceMetadata(source.title, rawText);
    if (source.type === 'youtube') {
      if (source.youtubeDescription) metadata.description = source.youtubeDescription;
      if (source.chapters && source.chapters.length > 0) metadata.chapters = source.chapters;
    }

    // 5. Chunk text
    updateStep('Chunking Text', 'processing');
    console.log(`Chunking text for source: ${source.title}...`);
    const chunks = await chunkText(rawText);
    updateStep('Chunking Text', 'completed');
    console.log(`Created ${chunks.length} chunks.`);

    // 6. Vector Storage Integration (Milestone 7)
    updateStep('Generating Vector Embeddings', 'processing');
    const points = await generateEmbeddings(chunks, notebookId, sourceId, source.title);
    updateStep('Generating Vector Embeddings', 'completed');
    
    if (points.length > 0) {
      updateStep('Uploading to Qdrant', 'processing');
      console.log(`Storing ${points.length} vectors in Qdrant...`);
      await upsertPoints(points);
      updateStep('Uploading to Qdrant', 'completed');
    } else {
      updateStep('Uploading to Qdrant', 'not_applicable');
    }

    // 7. Calculate Source Quality Score & Explanation
    let qualityScore = 'good';
    let qualityReason = 'Source text successfully extracted and indexed.';

    if (source.type === 'youtube') {
      if (transcriptStatus === 'extracted') {
        if (hasTimestamps && hasChapters && rawText.length > 1000) {
          qualityScore = 'excellent';
          qualityReason = 'Full video transcript extracted with timestamps, chapter breakdown, and structured AI metadata.';
        } else if (rawText.length > 300) {
          qualityScore = 'good';
          qualityReason = 'Complete video transcript extracted and indexed into vector storage.';
        } else {
          qualityScore = 'fair';
          qualityReason = 'Short transcript snippet extracted from video captions.';
        }
      } else {
        qualityScore = 'limited';
        qualityReason = 'Indexed using video title and description. Closed captions were unavailable on YouTube for this video.';
      }
    } else {
      if (rawText.length > 1000) {
        qualityScore = 'excellent';
        qualityReason = 'Complete document content extracted, chunked, and embedded into vector storage.';
      } else if (rawText.length > 300) {
        qualityScore = 'good';
        qualityReason = 'Document text extracted and indexed cleanly.';
      } else {
        qualityScore = 'fair';
        qualityReason = 'Short document content extracted.';
      }
    }

    // Assemble granular Indexing Summary JSONB payload
    const indexingSummary = {
      source_type: source.type,
      transcript_status: transcriptStatus,
      transcript_language: transcriptLanguage,
      caption_type: captionType,
      character_count: rawText.length,
      chunk_count: chunks.length,
      vector_count: points.length,
      has_timestamps: hasTimestamps,
      has_chapters: hasChapters,
      processing_time_ms: Date.now() - startTime,
      steps: steps
    };

    // 8. Update status to ready with Quality Rating and Indexing Summary
    await db.query(
      `UPDATE sources 
       SET indexing_status = $1, 
           quality_score = $2, 
           quality_reason = $3, 
           indexing_summary = $4, 
           metadata = $5 
       WHERE id = $6 AND notebook_id = $7`,
      ['ready', qualityScore, qualityReason, JSON.stringify(indexingSummary), JSON.stringify(metadata), sourceId, notebookId]
    );

    console.log(`Source ${sourceId} indexed successfully with Quality Score: ${qualityScore}.`);
  } catch (error) {
    console.error(`Error processing source ${sourceId}:`, error);
    
    // Mark processing step as failed
    const currentStep = steps.find(s => s.status === 'processing') || steps[steps.length - 1];
    if (currentStep) currentStep.status = 'failed';

    const failedSummary = {
      source_type: 'unknown',
      transcript_status: 'failed',
      transcript_language: 'none',
      caption_type: 'none',
      character_count: 0,
      chunk_count: 0,
      vector_count: 0,
      has_timestamps: false,
      has_chapters: false,
      processing_time_ms: Date.now() - startTime,
      steps: steps
    };

    // Update status to error with Failed Quality Rating
    await db.query(
      `UPDATE sources 
       SET indexing_status = $1, 
           error_message = $2, 
           quality_score = $3, 
           quality_reason = $4, 
           indexing_summary = $5 
       WHERE id = $6 AND notebook_id = $7`,
      ['error', error.message, 'failed', error.message, JSON.stringify(failedSummary), sourceId, notebookId]
    );
  }
}
