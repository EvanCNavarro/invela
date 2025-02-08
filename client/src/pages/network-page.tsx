import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { SearchIcon, ArrowUpDown, ArrowRight, ArrowUpIcon, ArrowDownIcon, FilterIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

// Helper function to generate consistent slugs - must match company-profile-page.tsx
const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function NetworkPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | "ALL">("ALL");
  const { user } = useAuth();
  const itemsPerPage = 10;

  const { data: currentCompany } = useQuery({
    queryKey: ["/api/companies/current"],
    enabled: !!user
  });

  const { data: companiesData = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  // Extract companies from the nested structure
  const companies = companiesData.map(item => item.companies || item);

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
    .filter((company: any) => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || company.accreditationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort(sortCompanies);

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
          title={`${currentCompany?.name || 'Company'}'s Network`}
          description="View and manage companies in your network."
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AccreditationStatus | "ALL")}>
              <SelectTrigger className="w-[200px] justify-between bg-white">
                <div className="flex items-center">
                  <FilterIcon className="w-4 h-4 mr-2" />
                  <SelectValue className="text-left" placeholder="Filter by status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="AWAITING_INVITATION">Awaiting Invitation</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="PROVISIONALLY_APPROVED">Provisionally Approved</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Network"
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-background rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent text-left w-full justify-start"
                    onClick={() => handleSort("name")}
                  >
                    <span>Company</span>
                    {getSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent text-right w-full justify-end"
                    onClick={() => handleSort("riskScore")}
                  >
                    <span>Risk Score</span>
                    {getSortIcon("riskScore")}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    className="p-0 hover:bg-transparent text-center w-full justify-center"
                    onClick={() => handleSort("accreditationStatus")}
                  >
                    <span>Status</span>
                    {getSortIcon("accreditationStatus")}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
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
                    onClick={() => setLocation(`/network/company/${generateSlug(company.name)}`)}
                    onMouseEnter={() => setHoveredRow(company.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                          <img
                            src={defaultCompanyLogo}
                            alt="Default company logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className={cn(
                          "font-normal text-foreground",
                          hoveredRow === company.id && "underline"
                        )}>
                          {company.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{company.riskScore || "N/A"}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          company.accreditationStatus === 'PENDING' && "bg-yellow-100 text-yellow-800",
                          company.accreditationStatus === 'IN_REVIEW' && "bg-yellow-100 text-yellow-800",
                          company.accreditationStatus === 'PROVISIONALLY_APPROVED' && "bg-green-100 text-green-800",
                          company.accreditationStatus === 'APPROVED' && "bg-green-100 text-green-800",
                          company.accreditationStatus === 'SUSPENDED' && "bg-gray-100 text-gray-800",
                          company.accreditationStatus === 'REVOKED' && "bg-red-100 text-red-800",
                          company.accreditationStatus === 'EXPIRED' && "bg-red-100 text-red-800",
                          company.accreditationStatus === 'AWAITING_INVITATION' && "bg-gray-100 text-gray-800"
                        )}
                      >
                        {company.accreditationStatus?.replace(/_/g, ' ').toLowerCase() || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="invisible group-hover:visible flex items-center justify-center text-primary">
                        <span className="font-medium mr-2">View</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}