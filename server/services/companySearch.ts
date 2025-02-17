import { z } from "zod";
import { companies } from "@db/schema";

const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

interface SearchResult {
  items: {
    title: string;
    snippet: string;
    link: string;
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

export const searchCompanyInfo = async (companyName: string) => {
  try {
    // Construct search queries for different aspects
    const queries = [
      `${companyName} company stock ticker symbol`,
      `${companyName} company official website`,
      `${companyName} company profile employees revenue`,
      `${companyName} company legal structure incorporation`,
      `${companyName} company products services`,
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

    // Extract information from search results
    const companyInfo: Partial<typeof companies.$inferInsert> = {
      name: companyName,
    };

    for (const result of searchResults) {
      for (const item of result.items || []) {
        const { title, snippet, link } = item;
        const combinedText = `${title} ${snippet}`.toLowerCase();

        // Extract stock ticker
        if (!companyInfo.stockTicker && /stock|ticker|symbol/.test(combinedText)) {
          const tickerMatch = combinedText.match(/\b[A-Z]{1,5}\b/);
          if (tickerMatch) {
            companyInfo.stockTicker = tickerMatch[0];
          }
        }

        // Extract website URL
        if (!companyInfo.websiteUrl && /official|website|homepage/.test(combinedText)) {
          try {
            const url = new URL(link);
            if (!url.hostname.includes('linkedin') && !url.hostname.includes('facebook')) {
              companyInfo.websiteUrl = url.origin;
            }
          } catch (e) {
            console.error('Invalid URL:', link);
          }
        }

        // Extract number of employees
        if (!companyInfo.numEmployees && /employees/.test(combinedText)) {
          const employeeCount = extractNumberRange(combinedText);
          if (employeeCount) {
            companyInfo.numEmployees = employeeCount;
          }
        }

        // Extract incorporation year
        if (!companyInfo.incorporationYear && /founded|established|incorporated/.test(combinedText)) {
          const year = extractYear(combinedText);
          if (year) {
            companyInfo.incorporationYear = year;
          }
        }

        // Extract products and services
        if (!companyInfo.productsServices && /products|services|offerings/.test(combinedText)) {
          const productsMatch = snippet.match(/(?:products?|services?|offerings?):?\s*([^.]+)/i);
          if (productsMatch) {
            companyInfo.productsServices = productsMatch[1].trim();
          }
        }

        // Extract legal structure
        if (!companyInfo.legalStructure && /legal|structure|corporation|llc|incorporated/.test(combinedText)) {
          if (/corporation|inc\.?|incorporated/.test(combinedText)) {
            companyInfo.legalStructure = 'Corporation';
          } else if (/llc|limited liability company/.test(combinedText)) {
            companyInfo.legalStructure = 'LLC';
          }
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