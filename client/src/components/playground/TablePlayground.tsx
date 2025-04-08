import * as React from "react";
import { Table, type Column } from "./Table";
import { SearchBar } from "./SearchBar";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Eye } from "lucide-react";
import { useUnifiedToast } from "@/hooks/use-unified-toast";

interface DataItem {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  lastModified: string;
}

const sampleData: DataItem[] = [
  {
    id: "1",
    name: "Annual Report 2024.pdf",
    type: "PDF Document",
    size: 2500000,
    status: "Published",
    lastModified: "2024-02-01",
  },
  {
    id: "2",
    name: "Financial Analysis.xlsx",
    type: "Spreadsheet",
    size: 1200000,
    status: "Draft",
    lastModified: "2024-02-05",
  },
  {
    id: "3",
    name: "Marketing Presentation.pptx",
    type: "Presentation",
    size: 3800000,
    status: "Published",
    lastModified: "2024-02-08",
  },
];

const formatFileSize = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function TablePlayground() {
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [sortField, setSortField] = React.useState<string>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const unifiedToast = useUnifiedToast();

  const columns: Column<DataItem>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (item) => item.name,
      sortable: true,
      className: 'w-[300px]',
    },
    {
      id: 'type',
      header: 'Type',
      cell: (item) => item.type,
      sortable: true,
    },
    {
      id: 'size',
      header: 'Size',
      cell: (item) => formatFileSize(item.size),
      sortable: true,
      className: 'text-right',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (item) => item.status,
      sortable: true,
    },
    {
      id: 'lastModified',
      header: 'Last Modified',
      cell: (item) => new Date(item.lastModified).toLocaleDateString(),
      sortable: true,
    },
  ];

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleAction = (action: string, item: DataItem) => {
    if (action === "delete") {
      unifiedToast.warning("Action Triggered", `${action} action on ${item.name}`);
    } else {
      unifiedToast.info("Action Triggered", `${action} action on ${item.name}`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground mb-4">Default Table</p>
        <Table
          data={sampleData}
          columns={columns}
          className="w-full"
        />
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-4">Interactive Table with Search</p>
        <div className="space-y-4">
          <SearchBar
            data={sampleData}
            keys={['name', 'type', 'status']}
            onResults={setSearchResults}
            containerClassName="w-full max-w-md"
          />
          <Table
            data={sampleData}
            columns={columns}
            searchResults={searchResults}
            selectable
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
            actions={[
              {
                label: "View Details",
                icon: <Eye className="mr-2 h-4 w-4" />,
                onClick: (item) => handleAction("view", item),
              },
              {
                label: "Download",
                icon: <Download className="mr-2 h-4 w-4" />,
                onClick: (item) => handleAction("download", item),
              },
              {
                label: "Delete",
                icon: <Trash2 className="mr-2 h-4 w-4" />,
                onClick: (item) => handleAction("delete", item),
              },
            ]}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
