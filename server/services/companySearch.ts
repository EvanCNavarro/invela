import { z } from "zod";
import { companies } from "@db/schema";

const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

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

export const searchCompanyInfo = async (companyName: string) => {
  try {
    // Enhanced search queries targeting priority sources
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

    const searchPromises = queries.map(async (query) => {
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google API error: ${response.statusText}`);
      }

      return response.json() as Promise<SearchResult>;
    });

    const searchResults = await Promise.all(searchPromises);

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

      // Extract website URL with priority for main domain
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

      // Extract number of employees with better pattern matching
      if (!companyInfo.numEmployees && /employees|workforce|staff|team size/i.test(combinedText)) {
        const employeeCount = extractNumberRange(combinedText);
        if (employeeCount) {
          companyInfo.numEmployees = employeeCount;
        }
      }

      // Enhanced incorporation year extraction
      if (!companyInfo.incorporationYear && /founded|established|incorporated|started|began operations/i.test(combinedText)) {
        const year = extractYear(combinedText);
        if (year) {
          companyInfo.incorporationYear = year;
        }
      }

      // Improved products and services extraction
      if (!companyInfo.productsServices && /products|services|offerings|specializes|provides|manufactures/i.test(combinedText)) {
        const productsMatch = snippet.match(/(?:products?|services?|offerings?|provides?|manufactures?|specializes? in):?\s*([^.]+)/i);
        if (productsMatch) {
          const products = productsMatch[1].trim();
          if (products.length > 1) { // Avoid single character results
            companyInfo.productsServices = products;
          }
        }
      }

      // Enhanced legal structure extraction
      if (!companyInfo.legalStructure) {
        if (/corporation|inc\.?|incorporated/i.test(combinedText)) {
          companyInfo.legalStructure = 'Corporation';
        } else if (/llc|limited liability company/i.test(combinedText)) {
          companyInfo.legalStructure = 'LLC';
        }
      }

      // Enhanced description extraction prioritizing Wikipedia content
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

      // HQ address extraction
      if (!companyInfo.hqAddress && /headquarters|located|based|office/i.test(combinedText)) {
        const addressMatch = combinedText.match(/(?:headquarters|based|located)(?:\s+in)?\s+([^.]+)/i);
        if (addressMatch) {
          companyInfo.hqAddress = addressMatch[1].trim();
        }
      }
    }

    return companyInfo;
  } catch (error) {
    console.error('Error searching company info:', error);
    throw new Error('Failed to search company information');
  }
};

// Validation schema for search request
export const companySearchSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
});

export type CompanySearchRequest = z.infer<typeof companySearchSchema>;