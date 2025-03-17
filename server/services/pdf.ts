import PDFParser from 'pdf-parse';
import fs from 'fs';

export async function extractTextFromFirstPages(filePath: string, maxPages: number = 3): Promise<string> {
  console.log('[PDF Service] Starting text extraction from first pages:', {
    filePath,
    maxPages,
    timestamp: new Date().toISOString()
  });

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);

    console.log('[PDF Service] Reading PDF buffer:', {
      bufferSize: dataBuffer.length,
      timestamp: new Date().toISOString()
    });

    const data = await PDFParser(dataBuffer, {
      max: maxPages, // Only parse first N pages
      version: 'v2.0.550'
    });

    console.log('[PDF Service] Extraction successful:', {
      totalPages: data.numpages,
      extractedPages: Math.min(maxPages, data.numpages),
      extractedTextLength: data.text.length,
      timestamp: new Date().toISOString()
    });

    return data.text;
  } catch (error) {
    console.error('[PDF Service] Text extraction failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filePath,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}