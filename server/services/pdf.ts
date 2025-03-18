import { PDFExtract } from 'pdf.js-extract';
import fs from 'fs';

const pdfExtract = new PDFExtract();
const options = {
  firstPageOnly: false,
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

    // Extract with validation for maxPages
    const extractOptions = {
      ...options,
      pageNumbers: Array.from({ length: maxPages }, (_, i) => i) // Explicitly specify pages
    };

    const data = await pdfExtract.extract(filePath, extractOptions);

    if (!data?.pages?.length) {
      throw new Error('No pages extracted from PDF');
    }

    console.log('[PDF Service] Extraction successful:', {
      totalPages: data.pages.length,
      extractedPages: Math.min(maxPages, data.pages.length),
      timestamp: new Date().toISOString()
    });

    // Combine text from all extracted pages with proper spacing
    let text = data.pages
      .map(page => {
        if (!page?.content?.length) {
          console.warn('[PDF Service] Empty page content found');
          return '';
        }
        return page.content
          .map(item => item.str)
          .join(' ')
          .trim();
      })
      .filter(Boolean) // Remove empty pages
      .join('\n\n');

    if (!text.length) {
      throw new Error('No text content extracted from PDF');
    }

    // Truncate text if it exceeds the maximum length
    if (text.length > MAX_TEXT_LENGTH) {
      console.log('[PDF Service] Truncating text to stay within token limits:', {
        originalLength: text.length,
        truncatedLength: MAX_TEXT_LENGTH,
        timestamp: new Date().toISOString()
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