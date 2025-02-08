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

export default function NetworkPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AccreditationStatus | "ALL">("ALL");
  const itemsPerPage = 10;

  const { data: currentCompany } = useQuery({
    queryKey: ["/api/companies/current"],
  });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  const filteredAndSortedCompanies = companies
    .filter((company) => {
      if (statusFilter === "ALL") return true;
      return company.accreditation_status === statusFilter;
    })
    .filter((company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField as keyof typeof a];
      const bValue = b[sortField as keyof typeof b];
      const direction = sortDirection === "asc" ? 1 : -1;
      return aValue < bValue ? -direction : direction;
    });

  const CompanyCell = ({ company }: { company: any }) => (
    <div className="flex items-center gap-3">
      <img
        src={company.logo_url || defaultCompanyLogo}
        alt={`${company.name} logo`}
        className="h-8 w-8 rounded-full object-contain"
      />
      <div>
        <div className="font-medium">{company.name}</div>
        <div className="text-sm text-muted-foreground">{company.type}</div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6">
        <PageHeader
          title={`${currentCompany?.name}'s Network`}
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
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Added Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCompanies.map((company) => (
                <TableRow
                  key={company.id}
                  onMouseEnter={() => setHoveredRow(company.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <TableCell>
                    <CompanyCell company={company} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{company.accreditation_status}</Badge>
                  </TableCell>
                  <TableCell>{company.location}</TableCell>
                  <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      className={cn(
                        "transition-opacity",
                        hoveredRow === company.id ? "opacity-100" : "opacity-0"
                      )}
                      onClick={() => setLocation(`/companies/${company.id}`)}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}