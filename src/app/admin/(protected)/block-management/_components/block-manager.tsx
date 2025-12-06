
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addBlock, removeBlock, getBlockedIdentifiers } from '../actions';
import type { BlockedIdentifier } from '@/lib/definitions';
import { Loader2, Search, Trash2, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


interface BlockManagerProps {
  initialBlockedItems: BlockedIdentifier[];
  initialHasMore: boolean;
  total: number;
}

const FormattedDate = ({ dateString }: { dateString?: string }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}


export default function BlockManager({ initialBlockedItems, initialHasMore, total }: BlockManagerProps) {
  const [blockedItems, setBlockedItems] = useState(initialBlockedItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') || '';

  useEffect(() => {
    setBlockedItems(initialBlockedItems);
    setHasMore(initialHasMore);
    setPage(1);
  }, [initialBlockedItems, initialHasMore]);

  const handleBlockSubmit = async (formData: FormData) => {
    startSubmitTransition(async () => {
      const result = await addBlock(formData);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const handleRemoveBlock = async (id: string) => {
    startSubmitTransition(async () => {
      const result = await removeBlock(id);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setBlockedItems(prev => prev.filter(item => item._id.toString() !== id));
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchQuery = formData.get('search') as string;
    const params = new URLSearchParams(searchParams);
    params.set('search', searchQuery);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLoadMore = async () => {
    startLoadMoreTransition(async () => {
      const nextPage = page + 1;
      const { blockedItems: newItems, hasMore: newHasMore } = await getBlockedIdentifiers(nextPage, search);
      setBlockedItems(prev => [...prev, ...newItems]);
      setHasMore(newHasMore);
      setPage(nextPage);
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <form action={handleBlockSubmit}>
          <CardHeader>
            <CardTitle>Block by IP or Device Fingerprint</CardTitle>
            <CardDescription>Enter a value and a reason to block users. The reason will be shown to the blocked user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" required>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ip">IP Address</SelectItem>
                    <SelectItem value="fingerprint">Device Fingerprint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="value">Value</Label>
                <Input id="value" name="value" required placeholder="Enter IP or Fingerprint ID" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Block Message</Label>
              <Textarea id="reason" name="reason" required placeholder="This message will be shown to the user." />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Ban className="mr-2" />}
              Add Block
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                   <CardTitle>Active Blocks</CardTitle>
                   <Badge variant="destructive">{total}</Badge>
                </div>
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <Input name="search" placeholder="Search by value..." defaultValue={search} className="w-56"/>
                    <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
                </form>
            </div>
        </CardHeader>
        <CardContent>
            {blockedItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No active blocks found.</p>
            ) : (
                <div className="space-y-3">
                    {blockedItems.map(item => (
                        <div key={item._id.toString()} className="border p-4 rounded-lg bg-destructive/5 space-y-2">
                             <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="font-semibold font-mono text-destructive">{item.value}</p>
                                    <Badge variant={item.type === 'ip' ? 'secondary' : 'outline'}>{item.type}</Badge>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isSubmitting}><Trash2 className="h-4 w-4 text-muted-foreground"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will unblock this identifier and allow users to access the site again.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveBlock(item._id.toString())} className="bg-destructive hover:bg-destructive/90">Unblock</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <div className="text-sm border-t border-destructive/10 pt-2">
                                <p><strong>Block Message:</strong> {item.reason}</p>
                                <p className="text-xs text-muted-foreground mt-1">Blocked On: <FormattedDate dateString={item.createdAt as unknown as string} /></p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
        {hasMore && (
            <CardFooter className="justify-center">
                <Button onClick={handleLoadMore} disabled={isLoadingMore} variant="outline">
                    {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load More
                </Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
