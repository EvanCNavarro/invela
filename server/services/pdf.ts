import fs from 'fs';

// Custom PDF text extraction without relying on pdf-parse test files
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

    // Import pdf-parse dynamically to avoid initialization issues
    const PDFParser = (await import('pdf-parse')).default;

    console.log('[PDF Service] Reading PDF buffer:', {
      bufferSize: dataBuffer.length,
      timestamp: new Date().toISOString()
    });

    const data = await PDFParser(dataBuffer, {
      max: maxPages, // Only parse first N pages
      pagerender: function(pageData: any) {
        let render_options = {
          normalizeWhitespace: true,
          disableCombineTextItems: false
        };
        return pageData.getTextContent(render_options)
          .then(function(textContent: any) {
            let strings = textContent.items.map((item: any) => item.str);
            return strings.join(' ');
          });
      }
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