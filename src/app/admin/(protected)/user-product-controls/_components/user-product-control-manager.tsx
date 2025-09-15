'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Trash2, Lock, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findUserAndProductsForControl, setControlRule, deleteControlRule, getActiveControlRules, setUserRedeemDisabled } from '@/app/actions';
import type { User, Product, UserProductControl } from '@/lib/definitions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';


interface UserProductControlManagerProps {
    initialRules: UserProductControl[];
    initialHasMore: boolean;
    totalRules: number;
}

export default function UserProductControlManager({ initialRules, initialHasMore, totalRules }: UserProductControlManagerProps) {
    const [rules, setRules] = useState(initialRules);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [page, setPage] = useState(1);

    const [isSearching, startSearchTransition] = useTransition();
    const [isSubmitting, startSubmitTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isLoadingMore, startLoadMoreTransition] = useTransition();

    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [gamingId, setGamingId] = useState('');
    const [foundUser, setFoundUser] = useState<User | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState('');

    const [ruleType, setRuleType] = useState<'block' | 'allowPurchase' | 'hideProduct' | 'limitPurchase'>('block');
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [allowance, setAllowance] = useState(1);
    const [limit, setLimit] = useState(1);

    const presetReasons = ["Already purchased", "Item unavailable", "It's not for you", "You are blocked from buying this"];
    
     useEffect(() => {
        setRules(initialRules);
        setHasMore(initialHasMore);
        setPage(1);
    }, [initialRules, initialHasMore]);

    const handleRuleSearch = (event: React.FormEvent<HTMLFormElement>) => {
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
            const search = searchParams.get('search') || '';
            const { rules: newRules, hasMore: newHasMore } = await getActiveControlRules(nextPage, search);
            setRules(prev => [...prev, ...newRules]);
            setHasMore(newHasMore);
            setPage(nextPage);
        });
    };

    const handleSearch = async () => {
        if (!gamingId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a Gaming ID.' });
            return;
        }
        startSearchTransition(async () => {
            const result = await findUserAndProductsForControl(gamingId);
            if (result.success && result.user && result.products) {
                setFoundUser(result.user);
                setProducts(result.products);
                toast({ title: 'User Found', description: `Controls can now be set for ${gamingId}.`});
            } else {
                setFoundUser(null);
                setProducts([]);
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleRedeemToggle = async (checked: boolean) => {
        if (!foundUser) return;
        startSubmitTransition(async () => {
            const result = await setUserRedeemDisabled(foundUser.gamingId, checked);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                setFoundUser(prev => prev ? { ...prev, isRedeemDisabled: checked } : null);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };
    
    const handleSubmitRule = async (formData: FormData) => {
        if (!foundUser || !selectedProduct) {
            toast({ variant: 'destructive', title: 'Error', description: 'A user and product must be selected.' });
            return;
        }

        formData.append('gamingId', foundUser.gamingId);
        formData.append('productId', selectedProduct);
        formData.append('type', ruleType);

        if (ruleType === 'block') {
            const finalReason = reason === 'custom' ? customReason : reason;
            if (!finalReason) {
                toast({ variant: 'destructive', title: 'Error', description: 'A reason must be provided for blocking.' });
                return;
            }
            formData.append('reason', finalReason);
        } else if (ruleType === 'allowPurchase') {
            formData.append('allowance', String(allowance));
        } else if (ruleType === 'limitPurchase') {
            formData.append('limit', String(limit));
        }

        startSubmitTransition(async () => {
            const result = await setControlRule(formData);
            if (result.success) {
                toast({ title: 'Success', description: result.message });
                // Simple reload to refetch active rules list
                window.location.reload(); 
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };
    
    const handleDeleteRule = async (ruleId: string) => {
        startDeleteTransition(async () => {
            const result = await deleteControlRule(ruleId);
             if (result.success) {
                toast({ title: 'Success', description: result.message });
                setRules(prev => prev.filter(r => r._id.toString() !== ruleId));
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    }
    
    const getRuleDescription = (rule: UserProductControl) => {
        switch (rule.type) {
            case 'block':
                return `Blocked (${rule.blockReason})`;
            case 'allowPurchase':
                return `Allowance (${rule.allowanceCount} extra purchases)`;
            case 'limitPurchase':
                return `Limit (${rule.limitCount} total purchases)`;
            case 'hideProduct':
                return 'Product Hidden';
            default:
                return 'Unknown Rule';
        }
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Set New User-Product Rule</CardTitle>
                    <CardDescription>Control user access to products, override one-time limits, or set purchase caps.</CardDescription>
                </CardHeader>
                <form action={handleSubmitRule}>
                    <CardContent className="space-y-4">
                        <div className="flex items-end gap-2">
                            <div className="flex-grow space-y-2">
                                <Label htmlFor="gamingId">User's Gaming ID</Label>
                                <Input id="gamingId" value={gamingId} onChange={(e) => setGamingId(e.target.value)} placeholder="Enter Gaming ID"/>
                            </div>
                            <Button type="button" onClick={handleSearch} disabled={isSearching}>
                                {isSearching ? <Loader2 className="animate-spin"/> : <Search />}
                                Search
                            </Button>
                        </div>
                        
                        {foundUser && (
                           <div className="p-4 border rounded-md bg-muted/50 space-y-4">
                                <p className="font-semibold">Setting controls for: <span className="font-mono">{foundUser.gamingId}</span></p>

                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <h3 className="font-medium flex items-center gap-2">
                                            <FileCode />
                                            Redeem Code Payments
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Enable or disable the redeem code payment option for this user.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={foundUser.isRedeemDisabled}
                                        onCheckedChange={handleRedeemToggle}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                
                                <Separator />
                                
                                <h3 className="text-sm font-medium text-muted-foreground pt-2">Per-Product Rules</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="product-select">Select Product</Label>
                                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                        <SelectTrigger id="product-select"><SelectValue placeholder="Choose a product..." /></SelectTrigger>
                                        <SelectContent>
                                            {products.map(p => <SelectItem key={p._id.toString()} value={p._id.toString()}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Rule Type</Label>
                                    <Select value={ruleType} onValueChange={(v) => setRuleType(v as any)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="block">Block Purchase</SelectItem>
                                            <SelectItem value="limitPurchase">Set Purchase Limit</SelectItem>
                                            <SelectItem value="allowPurchase">Override One-Time-Buy</SelectItem>
                                            <SelectItem value="hideProduct">Hide Product</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                {ruleType === 'block' && (
                                    <div className="space-y-2">
                                        <Label>Block Reason</Label>
                                        <Select value={reason} onValueChange={setReason}>
                                            <SelectTrigger><SelectValue placeholder="Select a preset reason..." /></SelectTrigger>
                                            <SelectContent>
                                                {presetReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                <SelectItem value="custom">Custom Reason</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {reason === 'custom' && (
                                            <Input placeholder="Enter custom reason" value={customReason} onChange={e => setCustomReason(e.target.value)}/>
                                        )}
                                    </div>
                                )}
                                
                                {ruleType === 'allowPurchase' && (
                                    <div className="space-y-2">
                                        <Label>Number of Extra Purchases to Allow</Label>
                                        <Input type="number" min="1" value={allowance} onChange={e => setAllowance(Number(e.target.value))}/>
                                        <p className="text-xs text-muted-foreground">This applies to products marked as "1 Time Buy".</p>
                                    </div>
                                )}
                                
                                {ruleType === 'limitPurchase' && (
                                    <div className="space-y-2">
                                        <Label>Total Purchase Limit</Label>
                                        <Input type="number" min="1" value={limit} onChange={e => setLimit(Number(e.target.value))}/>
                                        <p className="text-xs text-muted-foreground">Set the maximum number of times this user can buy this item.</p>
                                    </div>
                                )}

                           </div>
                        )}
                    </CardContent>
                    <CardFooter>
                       <Button type="submit" disabled={!foundUser || !selectedProduct || isSubmitting}>
                         {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                         Save Product Rule
                       </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-2">
                           <CardTitle>Active Control Rules</CardTitle>
                           <Badge variant="secondary" className="text-sm">{totalRules}</Badge>
                        </div>
                        <form onSubmit={handleRuleSearch} className="flex items-center gap-2">
                            <Input name="search" placeholder="Search by Gaming ID..." defaultValue={searchParams.get('search') || ''} className="w-56"/>
                            <Button type="submit" variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
                        </form>
                    </div>
                    <CardDescription>List of all currently active user-product restrictions and allowances.</CardDescription>
                </CardHeader>
                <CardContent>
                    {rules.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No active rules match your search.</p>
                    ) : (
                        <div className="space-y-2">
                           {rules.map(rule => (
                                <div key={rule._id.toString()} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                    <div>
                                        <p><strong>User:</strong> <span className="font-mono">{rule.gamingId}</span></p>
                                        <p><strong>Product:</strong> {rule.productName}</p>
                                        <p><strong>Rule:</strong> <span className="capitalize font-semibold">{getRuleDescription(rule)}</span></p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" disabled={isDeleting}><Trash2/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This action will permanently remove this control rule.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteRule(rule._id.toString())}>Delete Rule</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                           ))}
                        </div>
                    )}
                </CardContent>
                {hasMore && (
                    <CardFooter className="justify-center">
                        <Button onClick={handleLoadMore} disabled={isLoadingMore}>
                            {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Load More
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
