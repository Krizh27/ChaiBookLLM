export function buildRagPrompt(query, contextChunks) {
  let contextText = '';
  
  contextChunks.forEach((chunk, index) => {
    // We assign a 1-based index as the citation ID
    const citationId = index + 1;
    contextText += `[Source ID: ${citationId}]\n${chunk.payload.original_text}\n\n`;
  });

  return `You are a helpful AI research assistant. You are answering a user's question based strictly on the provided context sources.
  
Context Sources:
${contextText}

Instructions:
1. Answer the question using ONLY the provided context.
2. If the answer is not contained in the context, say "I cannot answer this based on the provided sources."
3. You MUST cite your sources. When you use information from a source, append the [Source ID] at the end of the relevant sentence (e.g., "AI is growing rapidly [1].").

User Question: ${query}`;
}
