export function buildRagPrompt(query, contextChunks) {
  let contextText = '';
  
  contextChunks.forEach((chunk, index) => {
    // We assign a 1-based index as the citation ID
    const citationId = index + 1;
    const sourceTitle = chunk.payload.source_title || 'Unnamed Source';
    contextText += `[Citation ${citationId} | Source Title: ${sourceTitle}]\n${chunk.payload.original_text}\n\n`;
  });

  return `You are an intelligent, helpful AI research assistant. You answer questions based strictly on the provided context sources.
  
Context Sources:
${contextText}

Instructions:
1. Answer the question accurately using ONLY the facts found in the provided Context Sources.
2. If the user's question connects two or more unrelated topics from completely different sources (for example, asking about Newton's views on modern web development when one source is physics and another is a programming syllabus), politely explain that these are distinct topics from completely separate sources with no connection between them, and guide the user to clarify or reframe their question for each topic individually.
3. If the requested answer is completely missing from the provided sources, state clearly and politely what cannot be answered based on the provided documents, and briefly summarize what general topics your current sources do cover so the user knows what they can ask about.
4. You MUST cite your sources using numerical square brackets. Whenever you use information from a source, append its citation number at the end of the sentence (e.g., "Web development involves RESTful APIs [1].").

User Question: ${query}`;
}
