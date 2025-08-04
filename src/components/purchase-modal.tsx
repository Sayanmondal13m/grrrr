
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/definitions';
import { Flame, Loader2, X, ShieldCheck, Smartphone, Globe } from 'lucide-react';
import Image from 'next/image';
import { createRedeemCodeOrder, submitUtr } from '@/app/actions';
import QrCode from 'react-qr-code';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

interface PurchaseModalProps {
  product: Product;
  onClose: () => void;
}

type ModalStep = 'details' | 'payment' | 'redeem' | 'utr' | 'processing';

const upiId = "9907703991-1@okbizaxis";

export default function PurchaseModal({ product, onClose }: PurchaseModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [step, setStep] = useState<ModalStep>('details');
  const [gamingId, setGamingId] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [utr, setUtr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const router = useRouter();
  const { toast } = useToast();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Allow for closing animation
  }, [onClose]);

  const goToOrderPage = () => {
    handleClose();
    router.push('/order');
  };

  // Timer for QR code validity and UTR popup
  useEffect(() => {
    if (step === 'payment') {
        const timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        const utrPopupTimer = setTimeout(() => {
            if (step === 'payment') {
                setStep('utr');
            }
        }, 20000); // 20 seconds

        return () => {
            clearInterval(timer);
            clearTimeout(utrPopupTimer);
        };
    }
  }, [step]);


  const handleBuyWithUpi = async () => {
    if (!gamingId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your Gaming ID.' });
      return;
    }
    setStep('payment');
  };

  const handleBuyWithRedeemCode = async () => {
     if (!gamingId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your Gaming ID.' });
      return;
    }
    setStep('redeem');
  };

  const handleRedeemSubmit = async () => {
    if (!redeemCode) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter your redeem code.' });
        return;
    }
    setIsLoading(true);
    const result = await createRedeemCodeOrder(product, gamingId, redeemCode);
    if (result.success) {
        setStep('processing');
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsLoading(false);
  }

  const handleUtrSubmit = async () => {
    if (!utr) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter the UTR.' });
        return;
    }
    setIsLoading(true);
    const result = await submitUtr(product, gamingId, utr);
    if (result.success) {
        setStep('processing');
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsLoading(false);
  }

  const upiLink = (app: 'gpay' | 'paytm' | 'phonepe') => {
    const base = {
        gpay: 'upi://pay',
        paytm: 'paytmmp://pay',
        phonepe: 'phonepe://pay',
    }[app];
    const params = new URLSearchParams({
        pa: upiId,
        pn: 'Garena Gears',
        am: product.price.toString(),
        cu: 'INR',
        tn: `Order for ${product.name}`,
    });
    return `${base}?${params.toString()}`;
  }

  const renderContent = () => {
    switch (step) {
      case 'details':
        return (
          <>
            <DialogHeader>
                <div className="flex items-center gap-2 mb-4">
                    <Flame className="h-7 w-7 text-primary" />
                    <DialogTitle className="text-2xl font-headline">Garena Gears</DialogTitle>
                </div>
            </DialogHeader>
            <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                    <div className="relative w-24 h-24 rounded-md overflow-hidden">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-cover"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-2xl font-bold text-primary">${product.price}</p>
                    </div>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="server">Server</Label>
                  <Select defaultValue="india" onValueChange={(value) => {
                    if (value !== 'india') {
                      toast({
                        variant: 'default',
                        title: 'Server Information',
                        description: 'Only the India server is supported at this time.',
                      })
                    }
                  }}>
                    <SelectTrigger id="server" className="w-full">
                      <SelectValue placeholder="Select a server" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="india">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          India
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="gaming-id">Enter your Gaming ID</Label>
                    <Input id="gaming-id" placeholder="Your in-game ID" value={gamingId} onChange={e => setGamingId(e.target.value)} />
                </div>
                <div className="space-y-2">
                   <Button onClick={handleBuyWithUpi} className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : `Buy ($${product.price})`}
                    </Button>
                    <Button onClick={handleBuyWithRedeemCode} className="w-full" variant="secondary" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : `Buy ($${product.price}) with Redeem Code`}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                    By continuing, you accept our{' '}
                    <Link href="/terms" className="underline hover:text-primary" onClick={handleClose}>
                        Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="underline hover:text-primary" onClick={handleClose}>
                        Privacy Policy
                    </Link>
                    .
                </p>
            </div>
          </>
        );
    case 'payment':
        return (
            <>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-headline flex items-center gap-2"><ShieldCheck className="text-green-500" />Secure UPI Payment</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-white rounded-lg border">
                        <QrCode value={upiLink('gpay')} size={160} />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold">Scan to pay with any UPI app</p>
                        <p className="text-sm text-muted-foreground">Expires in: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
                    </div>
                    
                    <div className="w-full border-t pt-4 space-y-3">
                         <p className="text-center text-sm font-semibold flex items-center justify-center gap-2"><Smartphone />Or pay directly from your phone</p>
                         <div className="grid grid-cols-3 gap-2">
                            <Button asChild variant="outline"><a href={upiLink('gpay')}>Google Pay</a></Button>
                            <Button asChild variant="outline"><a href={upiLink('paytm')}>Paytm</a></Button>
                            <Button asChild variant="outline"><a href={upiLink('phonepe')}>PhonePe</a></Button>
                         </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold tracking-wider pt-2">Powered by UPI</p>
                </div>
            </>
        )
    case 'redeem':
        return (
            <>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-headline">Use Redeem Code</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="redeem-code">Enter your Redeem Code</Label>
                        <Input id="redeem-code" placeholder="XXXX-XXXX-XXXX" value={redeemCode} onChange={e => setRedeemCode(e.target.value)} />
                    </div>
                    <Button onClick={handleRedeemSubmit} className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : `Submit Code & Buy ($${product.price})`}
                    </Button>
                    <Button variant="link" onClick={() => setStep('details')}>Back</Button>
                </div>
            </>
        )
    case 'utr':
        return (
            <>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-headline">Submit Transaction ID</DialogTitle>
                </DialogHeader>
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="utr-id">Enter your UTR/UPI Transaction ID</Label>
                        <Input id="utr-id" placeholder="12-digit transaction ID" value={utr} onChange={e => setUtr(e.target.value)} />
                    </div>
                    <Button onClick={handleUtrSubmit} className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Submit & Complete Order'}
                    </Button>
                     <Button variant="link" onClick={() => setStep('payment')}>Back to Payment</Button>
                </div>
            </>
        )
    case 'processing':
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <h2 className="text-2xl font-headline">Order Under Processing</h2>
                <p className="text-muted-foreground">Your order has been received and is now being processed. This usually takes just a few moments.</p>
                <p>You can track the status of your order on the "Order" page.</p>
                <Button onClick={goToOrderPage}>Go to Orders Page</Button>
            </div>
        )
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <button onClick={handleClose} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
