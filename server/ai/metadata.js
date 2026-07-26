import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates lightweight structured JSON metadata for an uploaded source document.
 * This runs exactly once per document during initial file processing.
 */
export async function generateSourceMetadata(title, rawText) {
  try {
    // Truncate sample text to ~15,000 characters to keep evaluation fast and cost-effective
    const textSample = rawText.slice(0, 15000);

    const systemPrompt = `You are an expert technical indexer and data curator.
Your job is to analyze the provided document text and extract lightweight metadata in strict JSON format.

Required JSON object properties:
- summary: A concise 2-3 sentence overview of what this source covers.
- main_topics: An array of strings representing the primary themes or subjects in this document.
- keywords: An array of important vocabulary terms, concepts, or tools discussed.
- named_entities: An array of prominent people, historical figures, organizations, or software frameworks mentioned.

Document Title: ${title || 'Untitled Document'}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Document Content:\n${textSample}` }
      ],
      temperature: 0.2,
    });

    const metadataJson = JSON.parse(completion.choices[0].message.content);
    console.log(`Successfully generated metadata for source: ${title}`);
    return metadataJson;
  } catch (error) {
    console.error("Failed to generate source metadata:", error);
    // Return a basic fallback object so document ingestion does not crash
    return {
      summary: "Metadata extraction failed; standard document indexing applied.",
      main_topics: [],
      keywords: [],
      named_entities: []
    };
  }
}

/**
 * Evaluates the user's chat question against stored source metadata to select relevant sources
 * or intercept unrelated multi-document combinations before performing vector retrieval.
 */
export async function routeQuery(query, sources) {
  if (!sources || sources.length === 0) {
    return {
      selected_source_ids: [],
      decision: "out_of_scope",
      explanation: "There are no uploaded sources ready in this notebook yet. Please add a document or URL first!"
    };
  }

  // Construct a concise catalog of uploaded documents and their AI summaries
  let catalogText = "";
  sources.forEach((s, i) => {
    const meta = s.metadata || {};
    const summary = meta.summary || "No automated summary available for this file.";
    const topics = (meta.main_topics || []).join(", ");
    catalogText += `[Source ID: ${s.id}]
Title: ${s.title}
Summary: ${summary}
Topics: ${topics || "Various topics"}\n\n`;
  });

  const systemPrompt = `You are an intelligent RAG routing supervisor.
Your job is to evaluate a user's question against a catalog of uploaded notebook sources and return a JSON routing evaluation.

Catalog of Available Sources:
${catalogText}

Instructions for evaluation:
Analyze the relationship between the user's question and the available sources. You must classify your decision into exactly one of these 4 categories:
1. "single_or_related": The question can be answered using one or more sources that cover relevant topics. Put the matching Source IDs into selected_source_ids.
2. "comparing": The user explicitly requests a comparison or relationship synthesis between multiple existing sources. Put all targeted Source IDs into selected_source_ids.
3. "unrelated_combination": The question conflates or mixes distinct topics from separate sources that have no connection in the materials (for example, asking what Isaac Newton said about Node.js when one source is physics and the other is programming). Do NOT select any IDs (leave empty). Instead, generate a helpful, polite explanation in the "explanation" property clarifying that these topics appear in entirely separate sources without connection, and invite the user to reframe their question for each topic individually.
4. "out_of_scope": The question asks about topics completely unrelated to any source in the catalog. Do NOT select any IDs (leave empty). Instead, generate a polite response in "explanation" explaining that none of the available sources cover this topic, and summarize briefly what topics the uploaded sources do cover.

Required JSON output schema:
{
  "selected_source_ids": ["uuid1", "uuid2"], // Array of strings containing selected Source IDs (empty if decision is unrelated_combination or out_of_scope)
  "decision": "single_or_related", // Exactly one of: "single_or_related", "comparing", "unrelated_combination", "out_of_scope"
  "explanation": null // String text containing explanation for user when decision is unrelated_combination or out_of_scope
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User Question: "${query}"` }
      ],
      temperature: 0.1,
    });

    const evaluation = JSON.parse(completion.choices[0].message.content);
    console.log(`Router evaluation decision: ${evaluation.decision}, Selected sources: ${evaluation.selected_source_ids?.length || 0}`);
    return evaluation;
  } catch (error) {
    console.error("Error executing query routing triage:", error);
    // On fallback error, gracefully select all source IDs so standard RAG search continues uninterrupted
    return {
      selected_source_ids: sources.map(s => s.id),
      decision: "single_or_related",
      explanation: null
    };
  }
}
