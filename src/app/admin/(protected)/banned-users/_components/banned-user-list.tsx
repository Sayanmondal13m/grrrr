'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowUpDown, Loader2, Search, ShieldCheck } from 'lucide-react';
import { unbanUser, getBannedUsers } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { type User } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';

interface BannedUserListProps {
    initialUsers: User[];
    initialHasMore: boolean;
    totalUsers: number;
}

const FormattedDate = ({ dateString }: { dateString?: string }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted || !dateString) return <span className="text-muted-foreground">N/A</span>;
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
}

export default function BannedUserList({ initialUsers, initialHasMore, totalUsers }: BannedUserListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const sort = searchParams.get('sort') || 'desc';
    const search = searchParams.get('search') || '';

    useEffect(() => {
        setUsers(initialUsers);
        setHasMore(initialHasMore);
        setPage(1);
    }, [initialUsers, initialHasMore]);

    const handleLoadMore = async () => {
        startTransition(async () => {
            const nextPage = page + 1;
            const { users: newUsers, hasMore: newHasMore } = await getBannedUsers(nextPage, search, sort);
            setUsers(prev => [...prev, ...newUsers]);
            setHasMore(newHasMore);
            setPage(nextPage);
        });
    };
    
    const handleSortToggle = () => {
        const newSort = sort === 'desc' ? 'asc' : 'desc';
        const params = new URLSearchParams(searchParams);
        params.set('sort', newSort);
        router.push(`${pathname}?${params.toString()}`);
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

    const handleUnban = async (userId: string) => {
        startTransition(async () => {
            const result = await unbanUser(userId);
             if (result.success) {
                setUsers(prevUsers => prevUsers.filter(user => user._id.toString() !== userId));
                toast({ title: 'Success', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-2">
                           <CardTitle>Banned Users</CardTitle>
                            {totalUsers !== undefined && (
                                <Badge variant="destructive">{totalUsers}</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex items-center gap-2">
                                <Input name="search" placeholder="Search by Gaming ID..." defaultValue={search} className="w-48"/>
                                <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
                            </form>
                            <Button variant="outline" onClick={handleSortToggle}>
                                <ArrowUpDown className="mr-2 h-4 w-4" />
                                {sort === 'desc' ? 'Newest First' : 'Oldest First'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No banned users found.</p>
                    ) : (
                        <div className="space-y-4">
                            {users.map(user => (
                                <Card key={user._id.toString()} className="bg-destructive/5 border-destructive/20">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-mono">{user.gamingId}</CardTitle>
                                            <Button variant="secondary" size="sm" onClick={() => handleUnban(user._id.toString())} disabled={isPending}>
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                Unban
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm"><strong>Ban Reason:</strong> {user.banMessage || 'No reason provided.'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Banned On: <FormattedDate dateString={user.bannedAt as unknown as string} />
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {hasMore && (
                <div className="text-center">
                    <Button onClick={handleLoadMore} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Load More
                    </Button>
                </div>
            )}
        </div>
    );
}
