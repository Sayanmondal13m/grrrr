'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Coins, Send, Tv } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { transferCoins } from '@/app/actions';
import { useFormStatus } from 'react-dom';

interface CoinSystemProps {
  user: User;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Sending...' : 'Send Coins'}
        </Button>
    )
}

export default function CoinSystem({ user }: CoinSystemProps) {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const { toast } = useToast();

  const handleTransfer = async (formData: FormData) => {
    const recipientGamingId = formData.get('recipientId') as string;
    const amount = Number(formData.get('amount'));
    
    const result = await transferCoins(recipientGamingId, amount);
    if (result.success) {
      toast({ title: 'Success!', description: result.message });
      setIsTransferOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }

  return (
    <section className="w-full py-8 bg-muted/40 border-b">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card className="flex flex-col items-center justify-center text-center p-6">
            <CardHeader>
                <Tv className="w-12 h-12 mx-auto text-primary" />
                <CardTitle className="mt-4">Watch & Earn</CardTitle>
                <CardDescription>Earn coins by watching short ads.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild size="lg">
                    <Link href="/watch-ad" target="_blank">Watch an Ad (Get 5 Coins)</Link>
                </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center justify-center text-center p-6">
             <CardHeader>
                <Coins className="w-12 h-12 mx-auto text-amber-500" />
                <CardTitle className="mt-4">Your Coin Wallet</CardTitle>
                <CardDescription>You currently have</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-4xl font-bold">{user.coins}</p>
                <Button variant="outline" onClick={() => setIsTransferOpen(true)}>
                    <Send className="mr-2 h-4 w-4" /> Transfer Coins
                </Button>
            </CardContent>
          </Card>
        </div>
      </div>

       <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Coins</DialogTitle>
            <DialogDescription>
              Send coins to another user. This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <form action={handleTransfer} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipientId">Recipient's Gaming ID</Label>
              <Input id="recipientId" name="recipientId" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" required min="1" max={user.coins} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <SubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
