import { PDFExtract } from 'pdf.js-extract';
import fs from 'fs';

const pdfExtract = new PDFExtract();
const options = {
  firstPageOnly: false,
  max: 3, // Extract first 3 pages only
  normalizeWhitespace: true,
  verbosity: 0 // Reduce console noise
};

// Each token is approximately 4 characters
const MAX_TEXT_LENGTH = 16000 * 4; // Set max length to stay within GPT-3.5-turbo's limit

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

    console.log('[PDF Service] Reading PDF file');
    const data = await pdfExtract.extract(filePath, { ...options, max: maxPages });

    console.log('[PDF Service] Extraction successful:', {
      totalPages: data.pages.length,
      extractedPages: Math.min(maxPages, data.pages.length),
      timestamp: new Date().toISOString()
    });

    // Combine text from all extracted pages
    let text = data.pages
      .map(page => page.content.map(item => item.str).join(' '))
      .join('\n');

    // Truncate text if it exceeds the maximum length
    if (text.length > MAX_TEXT_LENGTH) {
      console.log('[PDF Service] Truncating text to stay within token limits:', {
        originalLength: text.length,
        truncatedLength: MAX_TEXT_LENGTH
      });
      text = text.substring(0, MAX_TEXT_LENGTH);
    }

    return text;
  } catch (error) {
    console.error('[PDF Service] Text extraction failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filePath,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}