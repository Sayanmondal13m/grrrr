
'use client';

import { useState, useEffect, useActionState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from './ui/card';
import { Coins, Tv, Shield, KeyRound, Loader2, Send, AlertCircle } from 'lucide-react';
import type { User } from '@/lib/definitions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { transferCoins, setGiftPassword } from '@/app/actions';
import { useFormStatus } from 'react-dom';
import GamingIdModal from './gaming-id-modal';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { PasswordInput } from '@/app/account/_components/password-input';

interface CoinSystemProps {
  user: User | null;
}

function TransferSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
            {pending ? 'Sending...' : 'Send Coins'}
        </Button>
    )
}

function SetPasswordSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : 'Set Gift Password'}
        </Button>
    );
}

const initialState = { success: false, message: '' };

export default function CoinSystem({ user }: CoinSystemProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [hasModalBeenDismissed, setHasModalBeenDismissed] = useState(false);
  const { toast } = useToast();

  const [setPasswordState, setPasswordFormAction] = useActionState(setGiftPassword, initialState);
  const [transferState, transferFormAction] = useActionState(transferCoins, initialState);

  useEffect(() => {
    if (!user && !hasModalBeenDismissed) {
      const timer = setTimeout(() => setIsRegisterModalOpen(true), 1500); 
      return () => clearTimeout(timer);
    }
  }, [user, hasModalBeenDismissed]);
  
  useEffect(() => {
    if (setPasswordState.message) {
      toast({
        variant: setPasswordState.success ? 'default' : 'destructive',
        title: setPasswordState.success ? 'Success' : 'Error',
        description: setPasswordState.message,
      });
      if (setPasswordState.success) {
        setIsModalOpen(false);
      }
    }
  }, [setPasswordState, toast]);

  useEffect(() => {
    if (transferState.message) {
      toast({
        variant: transferState.success ? 'default' : 'destructive',
        title: transferState.success ? 'Success' : 'Error',
        description: transferState.message,
      });
      if (transferState.success) {
        setIsModalOpen(false);
      }
    }
  }, [transferState, toast]);

  const handleUnregisteredClick = (e: React.MouseEvent) => {
    if (!user) {
        e.preventDefault();
        setIsRegisterModalOpen(true);
    }
  };

  const handleModalOpenChange = (isOpen: boolean) => {
    setIsRegisterModalOpen(isOpen);
    if (!isOpen && !user) {
      setHasModalBeenDismissed(true);
    }
  };

  const renderModalContent = () => {
    if (!user) return null;

    // Case 1: User has not set a gift password yet
    if (!user.giftPassword) {
      // Sub-case 1.1: User is eligible to set the password
      if (user.canSetGiftPassword) {
        return (
          <form action={setPasswordFormAction}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><KeyRound /> Set Your Gift Password</DialogTitle>
              <DialogDescription>Create a secure password to protect your coin transfers. You will need this password every time you send coins to another player.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gift-password">New Gift Password</Label>
                <PasswordInput id="gift-password" name="giftPassword" required minLength={6} />
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <SetPasswordSubmitButton />
            </DialogFooter>
          </form>
        );
      }
      // Sub-case 1.2: User is NOT yet eligible to set the password
      return (
        <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Shield /> Secure Your Gifting</DialogTitle>
              <DialogDescription>To enable coin transfers, you first need to set a gift password.</DialogDescription>
            </DialogHeader>
            <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                    To unlock the gift password setup, you must first use all of your coins during a single purchase. Once that order is marked as "Completed" by our admin team, you will be able to set your password here. This is a one-time security verification step.
                </AlertDescription>
            </Alert>
            <DialogFooter>
              <DialogClose asChild><Button>Got it</Button></DialogClose>
            </DialogFooter>
        </>
      );
    }

    // Case 2: User has a password and wants to transfer coins
    return (
      <form action={transferFormAction}>
        <DialogHeader>
          <DialogTitle>Transfer Coins</DialogTitle>
          <DialogDescription>
            Send coins to another user. This action is irreversible. Your current balance is {user.coins}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipientId">Recipient's Gaming ID</Label>
            <Input id="recipientId" name="recipientId" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" required min="1" max={user.coins} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-gift-password">Your Gift Password</Label>
            <PasswordInput id="transfer-gift-password" name="giftPassword" required />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <TransferSubmitButton />
        </DialogFooter>
      </form>
    );
  };
  
  return (
    <>
      <GamingIdModal isOpen={isRegisterModalOpen} onOpenChange={handleModalOpenChange} />
      <section className="w-full py-6 bg-muted/40 border-b">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-center items-stretch gap-4">
            
            <Link 
              href="/watch-ad"
              onClick={handleUnregisteredClick} 
              className="flex-1 max-w-[100px] sm:max-w-[120px]"
            >
              <Card className="hover:bg-primary/5 transition-colors h-full">
                <CardContent className="p-2 flex flex-col items-center justify-center text-center min-h-[60px] w-[100px] sm:w-[120px]">
                    <Tv className="w-5 h-5 mx-auto text-primary" />
                    <p className="font-semibold mt-1 text-xs">Watch Ad</p>
                    <p className="text-xs text-muted-foreground">(+5 Coins)</p>
                </CardContent>
              </Card>
            </Link>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <div onClick={(e) => { handleUnregisteredClick(e); if (user) setIsModalOpen(true); }} className="flex-1 max-w-[100px] sm:max-w-[120px] cursor-pointer">
                    <Card className="hover:bg-primary/5 transition-colors h-full">
                    <CardContent className="p-2 flex flex-col items-center justify-center text-center min-h-[60px] w-[100px] sm:w-[120px]">
                        <Coins className="w-5 h-5 mx-auto text-amber-500" />
                        <p className="font-semibold mt-1 text-xs">{user ? `${user.coins} Coins` : "0 Coins"}</p>
                        <p className="text-xs text-muted-foreground">&nbsp;</p>
                    </CardContent>
                    </Card>
                </div>

              {user && (
                  <DialogContent>
                    {renderModalContent()}
                  </DialogContent>
              )}
            </Dialog>
          </div>
        </div>
      </section>
    </>
  );
}
