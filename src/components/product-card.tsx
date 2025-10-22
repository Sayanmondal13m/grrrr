

'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useState, useEffect } from 'react';
import PurchaseModal from './purchase-modal';
import type { Product, User, UserProductControl, Order } from '@/lib/definitions';
import { Ban, Coins, Timer, CheckCircle2, Lock, PackageCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { type ObjectId } from 'mongodb';
import ProductTag from './product-tag';


interface ProductCardProps {
  product: Product & { _id: string | ObjectId };
  user: User | null;
  orders: Order[];
  control: UserProductControl | undefined;
}

const LiveStock = ({ product }: { product: Product }) => {
    const [displayStock, setDisplayStock] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (!product.liveStock || !product.liveStockStart || !product.liveStockInterval) {
            return;
        }

        // Set initial stock immediately
        const initialElapsedSeconds = (new Date().getTime() - new Date(product.liveStockStart).getTime()) / 1000;
        const initialStockDecreased = Math.floor(initialElapsedSeconds / product.liveStockInterval);
        const initialTrueStock = Math.max(0, product.liveStock - initialStockDecreased);
        setDisplayStock(initialTrueStock);


        const calculateSmartStock = () => {
            const now = new Date();
            const start = new Date(product.liveStockStart!);
            const elapsedSeconds = (now.getTime() - start.getTime()) / 1000;
            const stockDecreased = Math.floor(elapsedSeconds / product.liveStockInterval!);
            const trueStock = Math.max(0, product.liveStock! - stockDecreased);

            setDisplayStock(currentDisplayStock => {
                // If display is lagging, catch it up quickly.
                if (currentDisplayStock > trueStock + 5) {
                    return Math.max(trueStock, currentDisplayStock - Math.floor(Math.random() * 3) - 1);
                }

                // Never let displayed stock go below true stock
                if (currentDisplayStock <= trueStock) {
                    return trueStock;
                }

                // Random chance to pause, decrease by 1, 2, or 3
                const randomAction = Math.random();
                if (randomAction < 0.25) { // 25% chance to pause
                    return currentDisplayStock;
                } else if (randomAction < 0.85) { // 60% chance to decrease by 1
                    return Math.max(trueStock, currentDisplayStock - 1);
                } else { // 15% chance to decrease by 2 or 3
                    const dropAmount = Math.random() < 0.7 ? 2 : 3;
                    return Math.max(trueStock, currentDisplayStock - dropAmount);
                }
            });
        };

        calculateSmartStock();
        // Use a faster interval for smoother, more dynamic updates
        const updateInterval = Math.min(Math.max(product.liveStockInterval * 1000, 200), 1000);
        const timer = setInterval(calculateSmartStock, updateInterval);

        return () => clearInterval(timer);
    }, [product]);

    if (!isMounted || !product.liveStock) {
        return null;
    }

    if (displayStock <= 0) {
        return <p className="text-sm text-destructive font-bold flex items-center gap-2"><Ban className="w-4 h-4"/> Sold Out!</p>
    }

    return (
        <p className="text-sm text-green-600 font-bold flex items-center gap-2">
            <PackageCheck className="w-4 h-4"/>
            {displayStock} Available
        </p>
    );
};


const CountdownTimer = ({ endDate, isComingSoon }: { endDate: Date; isComingSoon?: boolean }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      const now = new Date();
      const difference = new Date(endDate).getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);
  
  if (!isMounted) {
    return null;
  }

  const { days, hours, minutes, seconds } = timeLeft;

  const hasEnded = days === 0 && hours === 0 && minutes === 0 && seconds === 0;

  if (hasEnded) {
    return null; // When the timer finishes, render nothing.
  }

  const timerLabel = isComingSoon ? "Coming Soon:" : "Ending soon:";
  const timerColor = isComingSoon ? "text-teal-600 border-teal-500/20" : "text-destructive border-destructive/20";


  return (
    <div className={cn(
        "absolute top-2 right-2 bg-background/80 backdrop-blur-sm font-bold text-xs px-2 py-1 rounded-full shadow-md flex items-center gap-1.5 border",
        timerColor
      )}>
        <Timer className="w-3.5 h-3.5" />
        <>
            <span>{timerLabel}</span>
            <div className="flex items-center gap-1 font-mono tracking-tighter">
                {days > 0 && <span>{String(days).padStart(2, '0')}d</span>}
                <span>{String(hours).padStart(2, '0')}h</span>
                <span>{String(minutes).padStart(2, '0')}m</span>
                <span>{String(seconds).padStart(2, '0')}s</span>
            </div>
        </>
       
    </div>
  );
};


export default function ProductCard({ product, user, orders, control }: ProductCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const finalPrice = product.isCoinProduct 
    ? product.purchasePrice || product.price 
    : product.price - (product.coinsApplicable || 0);

  const handleBuyClick = () => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Please Register',
            description: 'You need to enter your Gaming ID to make a purchase.',
        });
        return;
    }
    setIsModalOpen(true);
  }

  const productWithStrId = { ...product, _id: product._id.toString() };
  
  const getBuyButton = () => {
    let isLiveStockSoldOut = false;
    if (product.liveStock && product.liveStockStart && product.liveStockInterval) {
        const elapsedSeconds = (new Date().getTime() - new Date(product.liveStockStart).getTime()) / 1000;
        const stockDecreased = Math.floor(elapsedSeconds / product.liveStockInterval);
        isLiveStockSoldOut = (product.liveStock - stockDecreased) <= 0;
    }

    if(isLiveStockSoldOut) {
        return <Button className="w-full font-bold text-base" disabled variant="secondary"><Ban className="mr-2 h-4 w-4" />Sold Out</Button>;
    }


    const isEventActive = product.endDate && new Date(product.endDate) > new Date();

    if (product.isComingSoon && isEventActive) {
        return <Button className="w-full font-bold text-base" disabled variant="secondary"><Timer className="mr-2 h-4 w-4" />Coming Soon</Button>;
    }
    
    if (!product.isComingSoon && isEventActive === false && !product.isAvailable) {
       return <Button className="w-full font-bold text-base" disabled variant="secondary"><Ban className="mr-2 h-4 w-4" />Expired</Button>;
    }
    
    if (!product.isAvailable) {
      return <Button className="w-full font-bold text-base" disabled variant="secondary"><Ban className="mr-2 h-4 w-4" />Item Unavailable</Button>;
    }

    if (control?.type === 'block') {
      return <Button className="w-full font-bold text-base" disabled variant="secondary"><Ban className="mr-2 h-4 w-4" />{control.blockReason}</Button>;
    }

    const nonFailedOrders = orders.filter(o => o.status !== 'Failed' && o.productId === product._id.toString());
    const completedPurchases = orders.filter(o => o.status === 'Completed' && o.productId === product._id.toString()).length;

    // Rule 3: `limitPurchase` is the ultimate authority
    if (control?.type === 'limitPurchase' && control.limitCount && nonFailedOrders.length >= control.limitCount) {
        return <Button className="w-full font-bold text-base" disabled variant="secondary"><Lock className="mr-2 h-4 w-4" />Purchase Limit Reached</Button>;
    }
    
    // Rule 1: Strict check for "one-time purchase" items
    if (product.oneTimeBuy) {
        const allowance = control?.type === 'allowPurchase' ? (control.allowanceCount || 0) : 0;
        const totalAllowed = 1 + allowance;
        if (nonFailedOrders.length >= totalAllowed) {
            return <Button className="w-full font-bold text-base" disabled variant="secondary"><CheckCircle2 className="mr-2 h-4 w-4" />Already Purchased</Button>;
        }
    }

    return (
        <Button 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base transition-transform duration-200 hover:scale-105 font-sans relative overflow-hidden animate-glowing-ray"
          onClick={handleBuyClick}
        >
          Buy {product.price && <span className="line-through ml-2 text-accent-foreground/80">₹{product.price}</span>} <span className="ml-1">₹{finalPrice}</span>
        </Button>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="absolute -top-5 -right-2 z-10 drop-shadow-lg" style={{ transform: 'rotate(4deg)' }}>
            <div 
            className={cn(
                'relative text-white',
                'text-xs font-bold uppercase tracking-wider',
                'px-3 py-1 rounded-lg',
                'overflow-hidden animate-glowing-ray',
                product.tagColor === 'red' ? 'bg-red-600' : 'bg-green-600'
            )}
            >
            {product.tag}
            </div>
            <div className={cn(
                "absolute top-full right-2 w-0 h-0",
                "border-l-[10px] border-l-transparent",
                "border-r-[0px] border-r-transparent",
                "border-t-[12px]",
                product.tagColor === 'red' ? 'border-t-red-600' : 'border-t-green-600'
            )}></div>
        </div>
        <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="p-0">
            <div className="relative aspect-video">
              <Image src={product.imageUrl} alt={product.name} fill className="object-cover" data-ai-hint={product.dataAiHint}/>
              {product.endDate && <CountdownTimer endDate={new Date(product.endDate)} isComingSoon={product.isComingSoon} />}
            </div>
          </CardHeader>
          <CardContent className="flex-grow p-4">
            <CardTitle className="text-lg font-headline font-semibold">{product.name}</CardTitle>
            <div className="mt-1 space-y-1">
                <CardDescription className="text-sm">
                  Quantity: {product.quantity}
                </CardDescription>
                {product.liveStock && product.liveStockInterval && <LiveStock product={product} />}
            </div>
            {product.coinsApplicable > 0 && !product.isCoinProduct && (
              <div className="text-xs text-amber-600 font-semibold mt-1 flex items-center font-sans gap-1">
                <Coins className="w-3 h-3" />
                Use {product.coinsApplicable} Coins & Get it for ₹{finalPrice}
              </div>
            )}
          </CardContent>
          <CardFooter className="p-4 pt-0">
            {getBuyButton()}
          </CardFooter>
        </Card>
      </div>
      {isModalOpen && <PurchaseModal product={productWithStrId} user={user} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
