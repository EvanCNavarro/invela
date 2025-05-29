import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Globe, Users, Calendar, Briefcase, Shield, 
  ExternalLink, ChevronRight, DollarSign, Tag, Layers, 
  FileText, Award as BadgeIcon } from "lucide-react";
import { AccreditationStatusDisplay } from "@/components/company/AccreditationStatusDisplay";

interface BentoOverviewProps {
  company: any;
  users: any[];
  usersLoading: boolean;
  productServices: string[];
  clientsPartners: string[];
  companyAge: number | null;
  setActiveTab: (value: string) => void;
}

/**
 * Formats revenue amounts with K/M/B suffixes
 */
const formatRevenue = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    return `$${parseFloat(billions.toFixed(1))}B`;
  } else if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${parseFloat(millions.toFixed(1))}M`;
  } else if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `$${parseFloat(thousands.toFixed(1))}K`;
  } else {
    return `$${amount}`;
  }
};

/**
 * Maps revenue tiers to numeric values for formatting
 */
const revenueValueMap: Record<string, number> = {
  small: 5500000,      // $5.5M
  medium: 55000000,    // $55M
  large: 300000000,    // $300M
  xlarge: 1250000000   // $1.25B
};

/**
 * Formats a value with proper display
 */
const formatValue = (value: any, formatter?: (val: any) => string) => {
  if (value === null || value === undefined) {
    return 'Not available';
  }
  return formatter ? formatter(value) : value;
};

export function BentoOverview({
  company,
  users,
  usersLoading,
  productServices,
  clientsPartners,
  companyAge,
  setActiveTab
}: BentoOverviewProps) {
  return (
    <div className="space-y-8">
      {/* Top row with main company information and preview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Company Information Card */}
        <Card className="col-span-1 md:col-span-2 border border-gray-200 shadow-sm h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Building2 className="h-4 w-4 text-gray-500 mr-2" />
              <CardTitle className="text-base font-medium text-gray-800">Company Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Company Description */}
            <div className="space-y-1 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed">{company.description || 'Not available'}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Website */}
              <div className="flex items-start space-x-2">
                <Globe className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Website</h3>
                  {company.websiteUrl ? (
                    <a 
                      href={company.websiteUrl.startsWith('http') ? company.websiteUrl : `https://${company.websiteUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center"
                    >
                      {company.websiteUrl}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Not available</p>
                  )}
                </div>
              </div>
              
              {/* Category */}
              <div className="flex items-start space-x-2">
                <Tag className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Category</h3>
                  <p className="text-sm text-gray-700">{company.category || 'Not available'}</p>
                </div>
              </div>
              
              {/* Employees */}
              <div className="flex items-start space-x-2">
                <Users className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Employees</h3>
                  <p className="text-sm text-gray-700">{company.numEmployees || 'Not available'}</p>
                </div>
              </div>
              
              {/* Founded */}
              <div className="flex items-start space-x-2">
                <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Founded</h3>
                  <p className="text-sm text-gray-700">
                    {company.incorporationYear ? (
                      <>
                        {company.incorporationYear} <span className="text-gray-500">({companyAge} years ago)</span>
                      </>
                    ) : (
                      'Not available'
                    )}
                  </p>
                </div>
              </div>
              
              {/* Headquarters */}
              <div className="flex items-start space-x-2">
                <Building2 className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Headquarters</h3>
                  <p className="text-sm text-gray-700">{company.hqAddress || 'Not available'}</p>
                </div>
              </div>
              
              {/* Revenue Tier */}
              <div className="flex items-start space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Annual Revenue</h3>
                  <p className="text-sm text-gray-700">
                    {company.revenue ? 
                      formatRevenue(company.revenue) : 
                      (company.revenueTier || company.revenue_tier) ? 
                        formatRevenue(revenueValueMap[(company.revenueTier || company.revenue_tier).toLowerCase()]) :
                        'Not available'
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Risk Score Preview Card */}
        <Card className="border border-gray-200 shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-gray-500 mr-2" />
                <CardTitle className="text-base font-medium text-gray-800">Risk Overview</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="#" onClick={() => setActiveTab("risk")}>
                  View details
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xs mx-auto">
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Risk Score</p>
                <p className="text-3xl font-bold">{company.chosenScore || company.chosen_score || company.riskScore || company.risk_score || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Accreditation Status</p>
                <div className="mt-1">
                  <AccreditationStatusDisplay company={company} variant="pill" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Middle row with Products/Services and People */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products & Services Card */}
        <Card className="border border-gray-200 shadow-sm h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Layers className="h-4 w-4 text-gray-500 mr-2" />
              <CardTitle className="text-base font-medium text-gray-800">Products & Services</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {productServices && productServices.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {productServices.map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-2">No products or services information available</p>
            )}
          </CardContent>
        </Card>
        
        {/* Team Preview Card */}
        <Card className="border border-gray-200 shadow-sm h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-4 w-4 text-gray-500 mr-2" />
                <CardTitle className="text-base font-medium text-gray-800">Team</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="#" onClick={() => setActiveTab("users")}>
                  View all users
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Leadership Section */}
            {(company.foundersAndLeadership || company.founders_and_leadership) ? (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Leadership</h3>
                <p className="text-sm text-gray-700">{company.foundersAndLeadership || company.founders_and_leadership}</p>
              </div>
            ) : null}
            
            {/* Users Preview */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Team Members</h3>
              {usersLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              ) : users.length > 0 ? (
                <div className="space-y-3">
                  {users.slice(0, 3).map(user => (
                    <div key={user.id} className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </div>
                  ))}
                  {users.length > 3 && (
                    <p className="text-xs text-gray-500">+ {users.length - 3} more team members</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic py-2">No team members available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom row with additional information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clients & Partners Card */}
        <Card className="border border-gray-200 shadow-sm h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Briefcase className="h-4 w-4 text-gray-500 mr-2" />
              <CardTitle className="text-base font-medium text-gray-800">Clients & Partners</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {clientsPartners && clientsPartners.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {clientsPartners.map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-2">No clients or partners information available</p>
            )}
          </CardContent>
        </Card>
        
        {/* Funding Information */}
        <Card className="border border-gray-200 shadow-sm h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <BadgeIcon className="h-4 w-4 text-gray-500 mr-2" />
              <CardTitle className="text-base font-medium text-gray-800">Funding</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Funding Stage */}
              <div>
                <h3 className="text-sm font-medium text-gray-700">Funding Stage</h3>
                <p className="text-sm text-gray-700">{formatValue(company.fundingStage)}</p>
              </div>
              
              {/* Investors */}
              {company.investors && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Investors</h3>
                  <p className="text-sm text-gray-700">{company.investors}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Legal & Compliance */}
        <Card className="border border-gray-200 shadow-sm h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-gray-500 mr-2" />
              <CardTitle className="text-base font-medium text-gray-800">Legal & Compliance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Legal Structure */}
              <div>
                <h3 className="text-sm font-medium text-gray-700">Legal Structure</h3>
                <p className="text-sm text-gray-700">{formatValue(company.legalStructure)}</p>
              </div>
              
              {/* Certifications */}
              {company.certifications_compliance && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Certifications</h3>
                  <p className="text-sm text-gray-700">{company.certifications_compliance}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}