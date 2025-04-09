import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { queryClient } from '@/lib/queryClient';

export default function DebugPage() {
  const [info, setInfo] = useState({
    url: '',
    time: '',
    queries: [] as string[]
  });
  
  useEffect(() => {
    // Collect some basic debug info
    setInfo({
      url: window.location.href,
      time: new Date().toISOString(),
      queries: Object.keys(queryClient.getQueryCache().getAll().reduce((acc, query) => {
        // @ts-ignore
        acc[query.queryKey.toString()] = true;
        return acc;
      }, {}))
    });
  }, []);

  return (
    <div className="container mx-auto p-8 max-w-5xl">
      <Card className="shadow-md">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-2xl">Debug Information</CardTitle>
          <CardDescription>
            If you can see this page, the React application is rendering correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Environment Info</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>URL:</strong> {info.url}</li>
              <li><strong>Time:</strong> {info.time}</li>
              <li><strong>User Agent:</strong> {navigator.userAgent}</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Query Cache</h2>
            {info.queries.length > 0 ? (
              <ul className="list-disc pl-6 space-y-1">
                {info.queries.map(query => (
                  <li key={query}>{query}</li>
                ))}
              </ul>
            ) : (
              <p>No queries in cache</p>
            )}
          </div>
          
          <div className="pt-4 flex space-x-4">
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}