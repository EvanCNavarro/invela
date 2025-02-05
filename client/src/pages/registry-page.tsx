import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { SearchIcon, ArrowUpDown, ArrowRight, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AccreditationStatus } from "@/types/company";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import defaultCompanyLogo from "@/assets/default-company-logo.svg";

function getAccreditationBadgeVariant(status: AccreditationStatus) {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'PROVISIONALLY_APPROVED':
      return 'warning';
    case 'AWAITING_INVITATION':
      return 'secondary';
    case 'PENDING':
    case 'IN_REVIEW':
      return 'default';
    case 'SUSPENDED':
    case 'REVOKED':
    case 'EXPIRED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function CompanyCell({ company, isHovered }: { company: any; isHovered: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded flex items-center justify-center overflow-hidden bg-muted">
        {company.logoId ? (
          <img 
            src={`/api/companies/${company.id}/logo`} 
            alt={`${company.name} logo`}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultCompanyLogo;
            }}
          />
        ) : (
          <img 
            src={defaultCompanyLogo} 
            alt="Default company logo"
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <span className={cn(
        "text-foreground",
        isHovered && "underline"
      )}>
        {company.name}
      </span>
    </div>
  );
}

export default function RegistryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  const sortCompanies = (a: any, b: any) => {
    if (sortField === "name") {
      return sortDirection === "asc" 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortField === "riskScore") {
      const scoreA = a.riskScore || 0;
      const scoreB = b.riskScore || 0;
      return sortDirection === "asc" ? scoreA - scoreB : scoreB - scoreA;
    }
    return 0;
  };

  const filteredCompanies = companies
    .filter((company: any) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort(sortCompanies);

  // Convert company name to URL-friendly format
  const getCompanySlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' ?
      <ArrowUpIcon className="h-4 w-4 text-primary" /> :
      <ArrowDownIcon className="h-4 w-4 text-primary" />;
  };

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6">
        <PageHeader
          title="Invela Registry"
          description="View and manage companies in your network."
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-96">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-background rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">
                  <Button 
                    variant="ghost" 
                    className="p-0 hover:bg-transparent"
                    onClick={() => handleSort("name")}
                  >
                    <span>Company</span>
                    {getSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="p-0 hover:bg-transparent"
                    onClick={() => handleSort("riskScore")}
                  >
                    <span>Risk Score</span>
                    {getSortIcon("riskScore")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="p-0 hover:bg-transparent">
                    <span>Accreditation</span>
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No companies found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCompanies.map((company: any) => (
                  <TableRow
                    key={company.id}
                    className="group cursor-pointer hover:bg-muted/50 bg-white"
                    onClick={() => setLocation(`/registry/company/${getCompanySlug(company.name)}`)}
                    onMouseEnter={() => setHoveredRow(company.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <TableCell>
                      <CompanyCell 
                        company={company} 
                        isHovered={hoveredRow === company.id}
                      />
                    </TableCell>
                    <TableCell>{company.riskScore || "N/A"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getAccreditationBadgeVariant(company.accreditationStatus)}
                        className={cn(
                          "capitalize border-0",
                          company.accreditationStatus === 'PROVISIONALLY_APPROVED' && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
                          company.accreditationStatus === 'APPROVED' && "bg-green-100 text-green-800 hover:bg-green-100/80"
                        )}
                      >
                        {company.accreditationStatus?.replace(/_/g, ' ').toLowerCase() || 'Awaiting Invitation'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="invisible group-hover:visible flex items-center justify-center text-primary">
                        <span className="font-semibold mr-2">View</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(startIndex + 1, filteredCompanies.length)} to {Math.min(startIndex + itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} companies
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}