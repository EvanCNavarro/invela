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
  try {
    // Validate file exists and is accessible
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('PDF file is empty');
    }

    // Extract with page limit if specified
    const extractOptions = maxPages !== undefined ? {
      ...options,
      pageNumbers: Array.from({ length: Math.max(1, maxPages) }, (_, i) => i)
    } : options;

    const data = await pdfExtract.extract(filePath, extractOptions);

    if (!data?.pages?.length) {
      throw new Error('No pages extracted from PDF');
    }

    // Process each page and validate content
    const pageStats: PageExtractionStats[] = [];
    const processedPages = data.pages.map((page, pageIndex) => {
      if (!page?.content?.length) return '';

      let validItems = 0;
      let invalidItems = 0;
      let emptyItems = 0;

      // Join content items with space and clean up whitespace
      const pageText = page.content
        .map(item => {
          if (!item?.str) {
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

      // Only store statistics for pages with actual content
      if (pageText.length >= MIN_PAGE_TEXT_LENGTH) {
        pageStats.push({
          pageIndex,
          contentLength: pageText.length,
          validItemsCount: validItems,
          invalidItemsCount: invalidItems,
          emptyItemsCount: emptyItems
        });
      }

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

    // Log only the final extraction summary
    console.log('[PDF Service] Extraction complete:', {
      fileName: filePath.split('/').pop(),
      totalPages: data.pages.length,
      extractedPages: pageStats.length,
      totalContent: text.length,
      averageContentPerPage: Math.round(text.length / pageStats.length),
      invalidContentItems: pageStats.reduce((sum, stat) => sum + stat.invalidItemsCount, 0),
      timestamp: new Date().toISOString()
    });

    // Truncate text if it exceeds the maximum length
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH);
    }

    return text;
  } catch (error) {
    console.error('[PDF Service] Extraction failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      fileName: filePath.split('/').pop(),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}