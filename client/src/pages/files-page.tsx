
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search } from 'lucide-react';

interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export default function FilesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: files, isLoading, error } = useQuery<File[]>({
    queryKey: ['files'],
    queryFn: async () => {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return <LoadingScreen message="Loading files..." />;
  }

  if (error) {
    toast({
      title: 'Error',
      description: 'Failed to load files. Please try again later.',
      variant: 'destructive',
    });
  }

  const filteredFiles = files?.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.type.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    if (sizeInBytes < 1024 * 1024 * 1024) return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Files</h1>
        <Button>Upload New File</Button>
      </div>

      <div className="relative flex-1 max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded At</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">{file.name}</TableCell>
                  <TableCell>{file.type}</TableCell>
                  <TableCell>{formatFileSize(file.size)}</TableCell>
                  <TableCell>{new Date(file.uploadedAt).toLocaleString()}</TableCell>
                  <TableCell>{file.uploadedBy}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">View</Button>
                    <Button variant="ghost" size="sm">Download</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {searchQuery ? 'No files matching your search' : 'No files found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
