

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Product, User } from '@/lib/definitions';
import { Loader2, X, Smartphone, Globe, Coins, ShieldCheck, ShoppingCart, Check, FileInput } from 'lucide-react';
import Image from 'next/image';
import { createRedeemCodeOrder, registerGamingId as registerAction, createUpiOrder } from '@/app/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { checkPurchaseEligibility } from '@/app/actions/check-purchase-eligibility';
import { useRefresh } from '@/context/RefreshContext';
import { cn } from '@/lib/utils';
import ProductMedia from './product-media';
import QRCode from 'react-qr-code';

// The product passed to this modal has its _id serialized to a string
interface ProductWithStringId extends Omit<Product, '_id'> {
  _id: string;
}

interface PurchaseModalProps {
  product: ProductWithStringId;
  user: User | null;
  onClose: () => void;
}

type ModalStep = 'verifying' | 'register' | 'details' | 'processing' | 'qrPayment' | 'success';

const UTR_SUBMIT_DELAY = 20000; // 20 seconds
const QR_EXPIRY_SECONDS = 300; // 5 minutes

export default function PurchaseModal({ product, user: initialUser, onClose }: PurchaseModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<User | null>(initialUser);
  const [step, setStep] = useState<ModalStep>(initialUser ? 'verifying' : 'register');
  const [gamingId, setGamingId] = useState(initialUser?.gamingId || '');
  const [redeemCode, setRedeemCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUtrPopup, setShowUtrPopup] = useState(false);
  const [utr, setUtr] = useState('');
  const [qrCountdown, setQrCountdown] = useState(QR_EXPIRY_SECONDS);
  const [isQrLoading, setIsQrLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const eligibilityCheckPerformed = useRef(false);
  const { triggerRefresh } = useRefresh();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Allow for closing animation
  }, [onClose]);

  useEffect(() => {
    if (step === 'qrPayment') {
      const qrLoadTimer = setTimeout(() => setIsQrLoading(false), 1000);
      const utrPopupTimer = setTimeout(() => {
        setShowUtrPopup(true);
      }, UTR_SUBMIT_DELAY);
      const countdownTimer = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(qrLoadTimer);
        clearTimeout(utrPopupTimer);
        clearInterval(countdownTimer);
      }
    }
  }, [step]);
  

  useEffect(() => {
    if (step === 'verifying' && user && !eligibilityCheckPerformed.current) {
        eligibilityCheckPerformed.current = true; // Mark as performed immediately
        checkPurchaseEligibility(user._id.toString(), product._id)
            .then(result => {
                if (result.eligible) {
                    setStep('details');
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Not Eligible',
                        description: result.message
                    });
                    handleClose();
                    router.refresh(); // Refresh page to show updated state
                }
            });
    }
  }, [step, user, product._id, handleClose, router, toast]);

  useEffect(() => {
    // If the modal is open, and a user gets passed in (e.g. after registration), move to details
    if (isOpen && initialUser && step === 'register') {
      setUser(initialUser);
      setGamingId(initialUser.gamingId);
      setStep('verifying');
    }
  }, [initialUser, isOpen, step]);

  const handleRegister = async () => {
    if (!gamingId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your Gaming ID.' });
      return;
    }
    setIsLoading(true);
    const result = await registerAction(gamingId);
    if (result.success && result.user) {
        toast({ title: 'Success', description: result.message });
        window.location.reload();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
        setIsLoading(false);
    }
  };

  const coinsToUse = user && !product.isCoinProduct ? Math.min(user.coins, product.coinsApplicable || 0) : 0;
  const finalPrice = product.isCoinProduct 
    ? product.purchasePrice || product.price 
    : product.price - coinsToUse;

  const handleBuyWithUpi = async () => {
    setStep('qrPayment');
  };

  const handleUtrSubmit = async () => {
    if (!utr || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid UTR/Transaction ID.'});
        return;
    }
    setIsLoading(true);
    const result = await createUpiOrder(product, user.gamingId, utr, user);
    if (result.success) {
        setStep('processing');
        triggerRefresh();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsLoading(false);
  }

  const handleRedeemSubmit = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
        return;
    }
    if (!redeemCode) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter your redeem code.' });
        return;
    }
    setIsLoading(true);
    const result = await createRedeemCodeOrder(product, user.gamingId, redeemCode, user);
    if (result.success) {
        setStep('processing');
        triggerRefresh();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsLoading(false);
  }
  
  const renderContent = () => {
    switch (step) {
      case 'verifying':
        return (
            <>
                <DialogHeader>
                    <DialogTitle>Please Wait</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <h2 className="text-xl font-semibold"></h2>
                    <p className="text-muted-foreground"></p>
                </div>
            </>
        );
      case 'register':
        return (
             <>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-headline">Welcome to Garena Store</DialogTitle>
                    <DialogDescription>Please enter your Gaming ID to continue.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="gaming-id-register">Gaming ID</Label>
                        <Input id="gaming-id-register" placeholder="Your in-game user ID" value={gamingId} onChange={e => setGamingId(e.target.value.replace(/\D/g, ''))} type="tel" pattern="[0-9]*" />
                    </div>
                    <Button onClick={handleRegister} className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Register & Continue'}
                    </Button>
                </div>
            </>
        )
      case 'details':
        if (!user) return null; // Should not happen if step is 'details'
        return (
          <>
            <DialogHeader>
                <div className="flex items-center gap-2 mb-4">
                    <Image src="/img/garena.png" alt="Garena Logo" width={28} height={28} />
                    <DialogTitle className="text-2xl font-headline">Confirm Purchase</DialogTitle>
                </div>
            </DialogHeader>
            <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                    <div className="relative w-24 h-24 rounded-md overflow-hidden">
                        <ProductMedia src={product.imageUrl} alt={product.name} />
                    </div>
                    <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        {!product.isCoinProduct && <p className="text-sm text-muted-foreground line-through font-sans">Original Price: ₹{product.price}</p>}
                        {coinsToUse > 0 && !product.isCoinProduct && <p className="text-sm text-amber-600 flex items-center font-sans gap-1"><Coins className="w-4 h-4"/> Coins Applied: -₹{coinsToUse}</p>}
                        {product.isCoinProduct && <p className="text-sm text-muted-foreground line-through font-sans">Original Price: ₹{product.price}</p>}
                        <p className="text-2xl font-bold text-primary font-sans">Final Price: ₹{finalPrice}</p>
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
                    <Label htmlFor="gaming-id">Gaming ID</Label>
                    <Input id="gaming-id" value={user.visualGamingId || user.gamingId} readOnly disabled />
                </div>
                <div className="space-y-2">
                   <Button onClick={handleBuyWithUpi} className="w-full font-sans" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : `Pay ₹${finalPrice} via UPI`}
                    </Button>
                    {!product.onlyUpi && !user.isRedeemDisabled && (
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button className="w-full font-sans" variant="secondary" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin" /> : `Use Redeem Code`}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-headline">Use Redeem Code</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="redeem-code">Enter your Redeem Code</Label>
                                        <Input id="redeem-code" placeholder="XXXX-XXXX-XXXX" value={redeemCode} onChange={e => setRedeemCode(e.target.value)} />
                                    </div>
                                    <Button onClick={handleRedeemSubmit} className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : `Submit Code & Buy`}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                    By continuing, you accept our{' '}
                    <Link href="/terms" className="underline hover:text-primary" onClick={handleClose}>
                        Terms & Conditions
                    </Link>
                    .
                </p>
            </div>
          </>
        );
    case 'processing':
        return (
            <>
                <DialogHeader>
                    <DialogTitle className="text-xl font-headline">Processing Order</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <h2 className="text-2xl font-semibold">Order Under Processing</h2>
                    <p className="text-muted-foreground">Your order has been received and is now being processed. This usually takes just a few moments.</p>
                    <p>You can track the status of your order on the "Order" page.</p>
                    <Button asChild onClick={handleClose}><Link href="/order">Go to Orders Page</Link></Button>
                </div>
            </>
        );
    case 'qrPayment':
        const upiId = "sm187966-1@okicici";
        const upiUrl = `upi://pay?pa=${upiId}&pn=Garena&am=${finalPrice}&cu=INR&tn=Purchase for ${product.name}`;
        const minutes = Math.floor(qrCountdown / 60);
        const seconds = qrCountdown % 60;
        return (
            <>
                <DialogHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Image src="/img/garena.png" alt="Garena Logo" width={28} height={28} />
                        <DialogTitle className="text-2xl font-headline">Garena Store</DialogTitle>
                    </div>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                    <DialogDescription className="font-sans text-base text-center w-full">
                      Scan to pay or use your favorite UPI app
                    </DialogDescription>
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Amount to Pay</p>
                        <p className="text-4xl font-bold text-primary font-sans">₹{finalPrice}</p>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-white rounded-lg border w-40 h-40 relative flex items-center justify-center">
                            {isQrLoading ? (
                                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            ) : (
                                <QRCode value={upiUrl} size={144} />
                            )}
                        </div>
                        {qrCountdown > 0 && (
                           <div className="mt-2 flex items-center justify-center text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <p>Waiting for payment...</p>
                                <p className="font-mono font-semibold ml-2">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</p>
                            </div>
                        )}
                    </div>

                    <div className="w-full border-t pt-4 space-y-3">
                        <p className="text-xs text-center text-muted-foreground font-medium">Trusted by</p>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Image src="/img/gpay.png" alt="Google Pay" width={24} height={24} />
                                Google Pay
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Image src="/img/phonepay.png" alt="PhonePe" width={24} height={24} />
                                PhonePe
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Image src="/img/paytm.png" alt="Paytm" width={24} height={24} />
                                Paytm
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Smartphone className="w-6 h-6" />
                                Other UPI
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Powered by UPI India
                </div>
                 {/* UTR Submission Dialog */}
                 <Dialog open={showUtrPopup} onOpenChange={setShowUtrPopup}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><FileInput />Submit Payment Details</DialogTitle>
                            <DialogDescription>
                                Please enter the UTR/Transaction ID from your payment app to confirm your purchase.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="utr">UTR/Transaction ID</Label>
                                <Input id="utr" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Enter 12-digit ID" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleUtrSubmit} disabled={isLoading || !utr}>
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Submit & Create Order'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
        case 'success':
        return (
            <div className="text-center py-10 px-4 flex flex-col items-center justify-center">
                <div className="relative w-24 h-24 mb-4">
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping"></div>
                    <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-16 h-16 text-white stroke-[3] animate-in zoom-in-50" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold font-headline text-green-600 mb-2">Payment Successful!</h2>
                <p className="text-muted-foreground mb-4">Congratulations! Your purchase has been processed.</p>
                <p className="text-sm">You can check your <Button asChild variant="link" className="p-0"><Link href="/order">Order Page</Link></Button> for the delivery status.</p>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-6 overflow-hidden">
                    <div className="bg-green-500 h-1 rounded-full animate-progress-smooth" style={{'--duration': '5s'} as React.CSSProperties}></div>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" hideCloseButton={step === 'success'}>
        {step !== 'success' && (
            <DialogClose asChild>
                <button onClick={handleClose} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
                </button>
            </DialogClose>
        )}
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
