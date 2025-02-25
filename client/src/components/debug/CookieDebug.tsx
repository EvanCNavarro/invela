import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  secure?: boolean;
  httpOnly?: boolean;
}

export function CookieDebug() {
  const { toast } = useToast();
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [newCookieName, setNewCookieName] = useState('');
  const [newCookieValue, setNewCookieValue] = useState('');
  const [newCookiePath, setNewCookiePath] = useState('/');

  // Function to parse cookies from document.cookie
  const parseCookies = () => {
    const cookieString = document.cookie;
    const cookieArray = cookieString.split(';');
    const parsedCookies: Cookie[] = cookieArray.map(cookie => {
      const [name, value] = cookie.trim().split('=');
      return { name, value: decodeURIComponent(value || '') };
    });
    setCookies(parsedCookies);
  };

  // Parse cookies on component mount and when document.cookie changes
  useEffect(() => {
    parseCookies();
    
    // Set up an interval to check for cookie changes
    const intervalId = setInterval(parseCookies, 2000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleAddCookie = () => {
    if (!newCookieName.trim() || !newCookieValue.trim()) {
      toast({
        title: 'Error',
        description: 'Cookie name and value are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now

      document.cookie = `${newCookieName}=${newCookieValue}; path=${newCookiePath}; expires=${expiryDate.toUTCString()}`;
      
      toast({
        title: 'Cookie Added',
        description: `Added cookie: ${newCookieName}`,
      });
      
      // Reset form fields
      setNewCookieName('');
      setNewCookieValue('');
      setNewCookiePath('/');
      
      // Refresh cookie list
      parseCookies();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to set cookie: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCookie = (cookieName: string) => {
    try {
      // Set the cookie's expiration date to the past
      document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      
      toast({
        title: 'Cookie Deleted',
        description: `Deleted cookie: ${cookieName}`,
      });
      
      // Refresh cookie list
      parseCookies();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete cookie: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllCookies = () => {
    try {
      cookies.forEach(cookie => {
        document.cookie = `${cookie.name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      });
      
      toast({
        title: 'All Cookies Deleted',
        description: `Deleted ${cookies.length} cookies`,
      });
      
      // Refresh cookie list
      parseCookies();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete cookies: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Cookie Debugger</CardTitle>
        <CardDescription>
          View, add, and delete cookies. Note: HttpOnly cookies are not visible to JavaScript.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="view">
          <TabsList className="mb-4">
            <TabsTrigger value="view">View Cookies</TabsTrigger>
            <TabsTrigger value="add">Add Cookie</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view">
            {cookies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cookies.map((cookie, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{cookie.name}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{cookie.value}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteCookie(cookie.name)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                No cookies found. Note that HttpOnly cookies are not visible to JavaScript.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="add">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="cookieName">Cookie Name</Label>
                <Input 
                  id="cookieName" 
                  placeholder="e.g., sid"
                  value={newCookieName}
                  onChange={(e) => setNewCookieName(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="cookieValue">Cookie Value</Label>
                <Input 
                  id="cookieValue" 
                  placeholder="e.g., eyJhbGciOiJIUzI1..."
                  value={newCookieValue}
                  onChange={(e) => setNewCookieValue(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="cookiePath">Cookie Path</Label>
                <Input 
                  id="cookiePath" 
                  placeholder="e.g., /"
                  value={newCookiePath}
                  onChange={(e) => setNewCookiePath(e.target.value)}
                />
              </div>
              
              <Button onClick={handleAddCookie}>
                Add Cookie
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={parseCookies}>
          Refresh Cookies
        </Button>
        <Button variant="destructive" onClick={handleDeleteAllCookies}>
          Delete All Cookies
        </Button>
      </CardFooter>
    </Card>
  );
} 