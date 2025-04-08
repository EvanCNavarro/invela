import { z } from "zod";
import { companies } from "@db/schema";
import { validateAndCleanCompanyData } from "./openai";
import { openai } from "../utils/openaiUtils";

// Define priority sources and their weights
const PRIORITY_SOURCES = {
  'wikipedia.org': 5,
  'crunchbase.com': 4,
  'linkedin.com': 4,
  'dnb.com': 4,
  'zoominfo.com': 4,
  'bloomberg.com': 3,
  'reuters.com': 3,
  'sec.gov': 3,
};

interface SearchResult {
  items: {
    title: string;
    snippet: string;
    link: string;
    displayLink?: string;
    pagemap?: {
      metatags?: Array<Record<string, string>>;
    };
  }[];
}

const extractNumberRange = (text: string): number | null => {
  const matches = text.match(/(\d{1,3}(?:,\d{3})*)/g);
  return matches ? parseInt(matches[0].replace(/,/g, '')) : null;
};

const extractYear = (text: string): number | null => {
  const matches = text.match(/\b(19|20)\d{2}\b/);
  return matches ? parseInt(matches[0]) : null;
};

const cleanUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Extract main domain (e.g., tesla.com from ir.tesla.com)
    const parts = urlObj.hostname.split('.');
    if (parts.length > 2 && !parts[0].toLowerCase().includes('www')) {
      parts.shift(); // Remove subdomain
    }
    return `https://${parts.join('.')}`;
  } catch (e) {
    return url;
  }
};

const getSourceScore = (url: string): number => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    for (const [priorityDomain, score] of Object.entries(PRIORITY_SOURCES)) {
      if (domain.includes(priorityDomain)) {
        return score;
      }
    }
  } catch (e) {
    console.error('Invalid URL when scoring:', url);
  }
  return 1; // Default score for non-priority sources
};

const extractStockTicker = (text: string): string | null => {
  // Look for stock ticker patterns
  const patterns = [
    /\(NYSE:\s*([A-Z]{1,5})\)/i,
    /\(NASDAQ:\s*([A-Z]{1,5})\)/i,
    /stock symbol:?\s*([A-Z]{1,5})/i,
    /ticker:?\s*([A-Z]{1,5})/i,
    /\b[A-Z]{1,5}\b(?=\s*(?:stock|shares))/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return null;
};

// Function for Google-only search
export const googleOnlySearch = async (companyName: string) => {
  console.log(`[Google Search] Starting search for company: ${companyName}`);
  const startTime = Date.now();

  try {
    const queries = [
      `${companyName} site:wikipedia.org`,
      `${companyName} company profile site:crunchbase.com`,
      `${companyName} company site:linkedin.com`,
      `${companyName} business profile site:dnb.com`,
      `${companyName} company info site:zoominfo.com`,
      `${companyName} company stock NYSE NASDAQ`,
      `${companyName} official website headquarters`,
      `${companyName} products services revenue employees`,
    ];

    console.log(`[Google Search] Executing ${queries.length} parallel queries`);
    const searchPromises = queries.map(async (query) => {
      const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google API error: ${response.statusText}`);
      }

      return response.json() as Promise<SearchResult>;
    });

    const searchResults = await Promise.all(searchPromises);
    console.log(`[Google Search] Retrieved ${searchResults.length} results`);

    // Combine and score results
    const scoredResults = searchResults.flatMap(result =>
      result.items?.map(item => ({
        ...item,
        score: getSourceScore(item.link)
      })) ?? []
    ).sort((a, b) => b.score - a.score);

    const allText = scoredResults.map(item => `${item.title} ${item.snippet}`).join(' ');

    const companyInfo: Partial<typeof companies.$inferInsert> = {
      name: companyName,
    };

    // Extract stock ticker from all text
    const stockTicker = extractStockTicker(allText);
    if (stockTicker) {
      companyInfo.stockTicker = stockTicker;
    }

    // Process results in order of priority score
    for (const item of scoredResults) {
      const { title, snippet, link } = item;
      const combinedText = `${title} ${snippet}`.toLowerCase();

      if (!companyInfo.websiteUrl && /official|website|homepage/.test(combinedText)) {
        try {
          const url = cleanUrl(link);
          if (!url.includes('linkedin.com') && !url.includes('facebook.com') && !url.includes('wikipedia.org')) {
            companyInfo.websiteUrl = url;
          }
        } catch (e) {
          console.error('Invalid URL:', link);
        }
      }

      if (!companyInfo.numEmployees && /employees|workforce|staff|team size/i.test(combinedText)) {
        const employeeCount = extractNumberRange(combinedText);
        if (employeeCount) {
          companyInfo.numEmployees = employeeCount;
        }
      }

      if (!companyInfo.incorporationYear && /founded|established|incorporated|started|began operations/i.test(combinedText)) {
        const year = extractYear(combinedText);
        if (year) {
          companyInfo.incorporationYear = year;
        }
      }

      if (!companyInfo.productsServices && /products|services|offerings|specializes|provides|manufactures/i.test(combinedText)) {
        const productsMatch = snippet.match(/(?:products?|services?|offerings?|provides?|manufactures?|specializes? in):?\s*([^.]+)/i);
        if (productsMatch) {
          const products = productsMatch[1].trim();
          if (products.length > 1) {
            companyInfo.productsServices = products;
          }
        }
      }

      if (!companyInfo.legalStructure) {
        if (/corporation|inc\.?|incorporated/i.test(combinedText)) {
          companyInfo.legalStructure = 'Corporation';
        } else if (/llc|limited liability company/i.test(combinedText)) {
          companyInfo.legalStructure = 'LLC';
        }
      }

      if (!companyInfo.description) {
        if (link.includes('wikipedia.org') && snippet.length > 50) {
          companyInfo.description = snippet.trim();
        } else if (!companyInfo.description && snippet.length > 50) {
          const descriptionMatch = snippet.match(/(?:is|as)\s+(?:a|an)\s+([^.]+)/i);
          if (descriptionMatch) {
            companyInfo.description = descriptionMatch[1].trim();
          } else if (snippet.includes(companyName)) {
            companyInfo.description = snippet.trim();
          }
        }
      }

      if (!companyInfo.hqAddress && /headquarters|located|based|office/i.test(combinedText)) {
        const addressMatch = combinedText.match(/(?:headquarters|based|located)(?:\s+in)?\s+([^.]+)/i);
        if (addressMatch) {
          companyInfo.hqAddress = addressMatch[1].trim();
        }
      }
    }

    const endTime = Date.now();
    console.log(`[Google Search] Completed in ${endTime - startTime}ms`, companyInfo);

    return companyInfo;

  } catch (error) {
    console.error('[Google Search] Error:', error);
    throw new Error('Failed to search company information using Google');
  }
};

// Enhanced logging for OpenAI search
export const openaiOnlySearch = async (companyName: string) => {
  console.log(`[OpenAI Search] Starting comprehensive search for company: ${companyName}`, {
    timestamp: new Date().toISOString(),
    mode: 'openai_only'
  });
  const startTime = Date.now();

  try {
    // Check cache first
    const cacheKey = `openai_search_${companyName.toLowerCase()}`;
    const cachedResult = (global as any).searchCache?.[cacheKey];

    if (cachedResult) {
      console.log('[OpenAI Search] Returning cached result:', {
        companyName,
        cachedFields: Object.keys(cachedResult),
        timestamp: new Date().toISOString()
      });
      return cachedResult;
    }

    const prompt = `
      As a financial data expert, provide detailed information about the company "${companyName}".
      Focus on accuracy and current information.

      Required information:
      1. Company Name
      2. Stock Ticker (if publicly traded)
      3. Website URL
      4. Legal Structure
      5. Headquarters Address
      6. Products/Services
      7. Incorporation Year
      8. Number of Employees
      9. Company Description
      10. Key Clients/Partners
      11. Founders and Leadership
      12. Revenue Range (if available)
      13. Certifications and Compliance

      Provide the information in a JSON format matching this interface:
      {
        name: string;
        stockTicker?: string;
        websiteUrl?: string;
        legalStructure?: string;
        hqAddress?: string;
        productsServices?: string;
        incorporationYear?: number;
        numEmployees?: number;
        description?: string;
        keyClientsPartners?: string[];
        foundersAndLeadership?: string;
        revenue?: string;
        certificationsCompliance?: string[];
      }

      If you're not confident about any piece of information, omit it from the JSON rather than guessing.
      For numbers, use only digits without commas or text.
    `;

    let retries = 2;
    let lastError = null;

    while (retries >= 0) {
      try {
        console.log(`[OpenAI Search] Attempt ${3 - retries} for ${companyName}`);

        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a financial data expert with access to comprehensive company information.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
        });

        if (!response.choices[0].message.content) {
          throw new Error("Empty response from OpenAI");
        }

        const companyInfo = JSON.parse(response.choices[0].message.content);

        console.log('[OpenAI Search] Successfully retrieved company data:', {
          companyName,
          retrievedFields: Object.keys(companyInfo),
          hasProducts: !!companyInfo.productsServices,
          hasFounders: !!companyInfo.foundersAndLeadership,
          timestamp: new Date().toISOString()
        });

        // Cache successful results
        if (!(global as any).searchCache) (global as any).searchCache = {};
        (global as any).searchCache[cacheKey] = companyInfo;

        const endTime = Date.now();
        console.log(`[OpenAI Search] Completed in ${endTime - startTime}ms`, companyInfo);

        return companyInfo;

      } catch (error: any) {
        lastError = error;
        console.error(`[OpenAI Search] Attempt ${3 - retries} failed:`, {
          error: error.message,
          status: error.status,
          timestamp: new Date().toISOString()
        });

        if (error.status === 429) {
          console.log("[OpenAI Search] Rate limit hit, waiting before retry");
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
        }

        retries--;
        if (retries >= 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('Failed to get response from OpenAI');

  } catch (error) {
    console.error('[OpenAI Search] Error:', error);
    throw error;
  }
};

// Function for hybrid search (Google + OpenAI)
export const searchCompanyInfo = async (companyName: string) => {
  console.log(`[Hybrid Search] Starting search for company: ${companyName}`);
  const startTime = Date.now();

  try {
    // First get data from Google Search
    console.log('[Hybrid Search] Fetching Google data');
    const googleData = await googleOnlySearch(companyName);

    // Then validate and clean with OpenAI
    console.log('[Hybrid Search] Validating with OpenAI');
    const cleanedData = await validateAndCleanCompanyData(googleData);

    const endTime = Date.now();
    console.log(`[Hybrid Search] Completed in ${endTime - startTime}ms`, cleanedData);

    return cleanedData;

  } catch (error) {
    console.error('[Hybrid Search] Error:', error);
    throw new Error('Failed to search company information');
  }
};

// Validation schema for search request
export const companySearchSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
});

export type CompanySearchRequest = z.infer<typeof companySearchSchema>;