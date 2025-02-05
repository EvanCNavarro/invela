import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { SearchIcon, ArrowUpDown, ArrowRight } from "lucide-react";
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

function CompanyCell({ company }: { company: any }) {
  return (
    <div className="flex items-center gap-3">
      {company.logoId ? (
        <div className="w-6 h-6 border-2 rounded flex items-center justify-center overflow-hidden">
          <img 
            src={`/api/companies/${company.id}/logo`} 
            alt={`${company.name} logo`}
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="w-6 h-6 border-2 rounded flex items-center justify-center bg-muted">
          {company.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-semibold text-foreground hover:underline">
        {company.name}
      </span>
    </div>
  );
}

export default function RegistryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  const filteredCompanies = companies.filter((company: any) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Convert company name to URL-friendly format
  const getCompanySlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
                  <Button variant="ghost" className="p-0 hover:bg-transparent">
                    <span>Company</span>
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="p-0 hover:bg-transparent">
                    <span>Description</span>
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="p-0 hover:bg-transparent">
                    <span>Risk Score</span>
                    <ArrowUpDown className="ml-2 h-4 w-4" />
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
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No companies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company: any) => (
                  <TableRow
                    key={company.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => setLocation(`/registry/company/${getCompanySlug(company.name)}`)}
                  >
                    <TableCell>
                      <CompanyCell company={company} />
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {company.marketPosition || "N/A"}
                    </TableCell>
                    <TableCell>{company.riskScore || "N/A"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getAccreditationBadgeVariant(company.accreditationStatus)}
                        className={cn(
                          "capitalize",
                          company.accreditationStatus === 'PROVISIONALLY_APPROVED' && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
                          company.accreditationStatus === 'APPROVED' && "bg-green-100 text-green-800 hover:bg-green-100/80"
                        )}
                      >
                        {company.accreditationStatus?.replace(/_/g, ' ').toLowerCase() || 'Awaiting Invitation'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="invisible group-hover:visible flex items-center justify-end text-primary">
                        <span className="mr-2">View</span>
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