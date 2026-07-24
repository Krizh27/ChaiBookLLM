import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Splits text into semantic chunks for vector storage.
 * This is highly reusable from the previous Advanced RAG project.
 */
export async function chunkText(text) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await splitter.createDocuments([text]);
  
  // Extract just the text from the LangChain Document objects
  return docs.map(doc => doc.pageContent);
}
