
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { getSmsLogs } from '../actions';
import type { SmsWebhookLog } from '@/lib/definitions';

interface SmsLogListProps {
    initialLogs: SmsWebhookLog[];
    initialHasMore: boolean;
    totalLogs: number;
}

const FormattedDate = ({ dateString }: { dateString: string }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'long' });
}

export default function SmsLogList({ initialLogs, initialHasMore, totalLogs }: SmsLogListProps) {
    const [logs, setLogs] = useState<SmsWebhookLog[]>(initialLogs);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        setLogs(initialLogs);
        setHasMore(initialHasMore);
        setPage(1);
    }, [initialLogs, initialHasMore]);

    const handleLoadMore = async () => {
        startTransition(async () => {
            const nextPage = page + 1;
            const { logs: newLogs, hasMore: newHasMore } = await getSmsLogs(nextPage);
            setLogs(prev => [...prev, ...newLogs]);
            setHasMore(newHasMore);
            setPage(nextPage);
        });
    };
    
    const getStatusVariant = (status: SmsWebhookLog['status']) => {
        switch (status) {
            case 'verified': return 'default';
            case 'unprocessed': return 'secondary';
            default: return 'destructive';
        }
    }
    
     const getStatusClass = (status: SmsWebhookLog['status']) => {
        switch (status) {
            case 'verified': return 'bg-green-500';
            case 'unprocessed': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Incoming SMS Logs</CardTitle>
                    <Badge variant="secondary">{totalLogs}</Badge>
                </div>
                <CardDescription>
                    A real-time log of all SMS messages received from the SMS Forwarder app.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No SMS logs received yet.</p>
                ) : (
                    <div className="space-y-3">
                        {logs.map(log => (
                            <div key={log._id.toString()} className="border p-4 rounded-lg text-sm bg-muted/40">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-mono text-xs">From: {log.sender || 'Unknown'}</p>
                                    <Badge variant={getStatusVariant(log.status)} className={getStatusClass(log.status)}>
                                        {log.status}
                                    </Badge>
                                </div>
                                <p className="font-mono bg-background p-2 rounded-md border">{log.body}</p>
                                <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                                    <span>Received: <FormattedDate dateString={log.receivedAt as unknown as string} /></span>
                                    {log.parsedAmount && (
                                        <span>Parsed Amount: <span className="font-bold font-sans text-foreground">₹{log.parsedAmount.toFixed(2)}</span></span>
                                    )}
                                </div>
                                {log.status === 'verified' && log.matchedGamingId && (
                                    <div className="text-xs mt-1 font-semibold text-green-600">
                                        Verified for Gaming ID: <span className="font-mono">{log.matchedGamingId}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
             {hasMore && (
                <CardFooter className="justify-center">
                    <Button onClick={handleLoadMore} disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Load More
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
