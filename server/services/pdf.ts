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
const MIN_TEXT_LENGTH = 50; // Minimum text length to consider content valid
const MIN_PAGE_TEXT_LENGTH = 10; // Minimum text length for a single page

interface PageExtractionStats {
  pageIndex: number;
  contentLength: number;
  validItemsCount: number;
  invalidItemsCount: number;
  emptyItemsCount: number;
}

export async function extractTextFromFirstPages(filePath: string, maxPages?: number): Promise<string> {
  console.log('[PDF Service] Starting text extraction from first pages:', {
    filePath,
    maxPages,
    timestamp: new Date().toISOString()
  });

  try {
    // Validate file exists and is accessible
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('PDF file is empty');
    }

    console.log('[PDF Service] Reading PDF file:', {
      fileSize: stats.size,
      timestamp: new Date().toISOString()
    });

    // Extract with page limit if specified
    const extractOptions = maxPages !== undefined ? {
      ...options,
      pageNumbers: Array.from({ length: Math.max(1, maxPages) }, (_, i) => i)
    } : options;

    const data = await pdfExtract.extract(filePath, extractOptions);

    if (!data?.pages?.length) {
      throw new Error('No pages extracted from PDF');
    }

    console.log('[PDF Service] Extraction successful:', {
      totalPages: data.pages.length,
      extractedPages: maxPages !== undefined ? Math.min(maxPages, data.pages.length) : data.pages.length,
      timestamp: new Date().toISOString()
    });

    // Process each page and validate content
    const pageStats: PageExtractionStats[] = [];
    const processedPages = data.pages.map((page, pageIndex) => {
      if (!page?.content?.length) {
        console.warn('[PDF Service] Empty page content found:', {
          pageIndex,
          timestamp: new Date().toISOString()
        });
        return '';
      }

      let validItems = 0;
      let invalidItems = 0;
      let emptyItems = 0;

      // Join content items with space and clean up whitespace
      const pageText = page.content
        .map(item => {
          if (!item?.str) {
            console.warn('[PDF Service] Invalid content item found:', {
              pageIndex,
              item,
              timestamp: new Date().toISOString()
            });
            invalidItems++;
            return '';
          }
          const text = item.str.trim();
          if (text.length === 0) {
            emptyItems++;
            return '';
          }
          validItems++;
          return text;
        })
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      pageStats.push({
        pageIndex,
        contentLength: pageText.length,
        validItemsCount: validItems,
        invalidItemsCount: invalidItems,
        emptyItemsCount: emptyItems
      });

      console.log('[PDF Service] Page processed:', {
        pageIndex,
        contentLength: pageText.length,
        validItems,
        invalidItems,
        emptyItems,
        hasContent: pageText.length > MIN_PAGE_TEXT_LENGTH,
        timestamp: new Date().toISOString()
      });

      return pageText.length >= MIN_PAGE_TEXT_LENGTH ? pageText : '';
    });

    // Filter out empty pages and join with double newline
    let text = processedPages
      .filter(pageText => pageText.length > 0)
      .join('\n\n');

    if (!text.length) {
      throw new Error('No text content extracted from PDF');
    }

    if (text.length < MIN_TEXT_LENGTH) {
      throw new Error(`Extracted text too short (${text.length} chars). Minimum required: ${MIN_TEXT_LENGTH}`);
    }

    console.log('[PDF Service] Content extraction complete:', {
      contentLength: text.length,
      pageCount: data.pages.length,
      nonEmptyPages: processedPages.filter(p => p.length > 0).length,
      pageStats,
      timestamp: new Date().toISOString()
    });

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
      stack: error instanceof Error ? error.stack : undefined,
      filePath,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}