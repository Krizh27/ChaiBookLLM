# Source Quality & Transparency System Documentation

The **Source Quality & Transparency System** in ChaiBookLLM is designed to provide full transparency to users regarding the exact quality, completeness, and extraction depth of their uploaded knowledge sources.

Rather than blaming AI models for missing information, ChaiBookLLM evaluates every source upon ingestion and clearly communicates the reliability of answers based on empirical source quality metrics.

---

## 1. Source Quality Rating Matrix

Every source is evaluated after processing and assigned a **Quality Score**:

| Score | Rating | Color | Technical Criteria |
| :--- | :--- | :--- | :--- |
| **`excellent`** | **🟢 Excellent** | Emerald | Full transcript (manual/auto) extracted + timestamp citations + chapter breakdown + >1,000 characters indexed. |
| **`good`** | **🟡 Good** | Blue | Complete transcript or document text extracted + >300 characters indexed. |
| **`fair`** | **🟠 Fair** | Amber | Short snippet or partial transcript extracted (<=300 characters). |
| **`limited`** | **🔴 Limited** | Rose | Closed captions were unavailable on YouTube (or document missing text). Source is indexed strictly using video title, description, and chapters. |
| **`failed`** | **⚫ Failed** | Dark Gray | Source ingestion failed completely due to network, unreadable format, or permissions. |

---

## 2. Granular Indexing Summary & Schema

Each source record in PostgreSQL contains an `indexing_summary` JSONB payload detailing:

```json
{
  "source_type": "youtube",
  "transcript_status": "extracted",
  "transcript_language": "en",
  "caption_type": "manual",
  "character_count": 4850,
  "chunk_count": 8,
  "vector_count": 8,
  "has_timestamps": true,
  "has_chapters": true,
  "processing_time_ms": 1420,
  "steps": [
    { "name": "Uploading Source", "status": "completed" },
    { "name": "Validating Source", "status": "completed" },
    { "name": "Extracting Content", "status": "completed" },
    { "name": "Detecting Captions", "status": "completed" },
    { "name": "Downloading Transcript", "status": "completed" },
    { "name": "Chunking Text", "status": "completed" },
    { "name": "Generating Vector Embeddings", "status": "completed" },
    { "name": "Uploading to Qdrant", "status": "completed" }
  ]
}
```

---

## 3. Answer Confidence Calculation

For every query processed by the RAG pipeline:
1. The system identifies all retrieved citation chunks.
2. The **Answer Confidence** badge is computed based on the quality ratings of the cited sources:
   - **🟢 Answer Confidence: Excellent**: All cited sources contain full transcripts with timestamps.
   - **🟡 Answer Confidence: Good**: Answer is grounded in complete extracted source text.
   - **🟠 Answer Confidence: Fair**: Answer relies on partial snippets or short documents.
   - **🔴 Answer Confidence: Limited (Metadata Only)**: One or more cited sources relied on video metadata only because closed captions were unavailable.

---

## 4. User Experience Components

1. **Knowledge Sources Quality Badges**: Visual indicators (🟢 Excellent, 🟡 Good, 🟠 Fair, 🔴 Limited, ⚫ Failed) shown directly in the sidebar and source list.
2. **Source Details & Timeline Modal**: Clicking `ℹ️ Details` opens a popup modal with the quality assessment, indexing metrics grid, and 8-step processing timeline.
3. **Chat Response Confidence Badges**: Displays an Answer Confidence pill on AI responses with hover tooltips explaining source grounding.
4. **Source Transparency Disclaimer Banner**: A subtle banner reminding users that AI responses are bounded by source completeness.
