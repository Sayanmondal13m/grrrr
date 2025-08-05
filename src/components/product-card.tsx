'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState } from 'react';
import PurchaseModal from './purchase-modal';
import type { Product, User } from '@/lib/definitions';
import { Ban, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface ProductCardProps {
  product: Product;
  user: User | null;
}

export default function ProductCard({ product, user }: ProductCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const finalPrice = product.price - product.coinsApplicable;

  const handleBuyClick = () => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Please Register',
            description: 'You need to enter your Gaming ID to make a purchase.',
        });
        // This relies on a global modal system or state, which is complex.
        // A simpler approach is to let the user see the modal and handle it there.
    }
    setIsModalOpen(true);
  }

  return (
    <>
      <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="relative aspect-video">
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" data-ai-hint={product.dataAiHint}/>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4">
          <CardTitle className="text-lg font-headline font-semibold">{product.name}</CardTitle>
          {product.coinsApplicable > 0 && (
            <div className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
              <Coins className="w-3 h-3" />
              Use {product.coinsApplicable} Coins & Get it for ₹{finalPrice}
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          {product.isAvailable ? (
            <Button 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base transition-transform duration-200 hover:scale-105 font-sans"
              onClick={handleBuyClick}
            >
              Buy <span className="line-through ml-2 text-accent-foreground/80">₹{product.price}</span> <span className="ml-1">₹{finalPrice}</span>
            </Button>
          ) : (
            <Button 
              className="w-full font-bold text-base"
              disabled
              variant="secondary"
            >
              <Ban className="mr-2 h-4 w-4" />
              Item Unavailable
            </Button>
          )}
        </CardFooter>
      </Card>
      {isModalOpen && <PurchaseModal product={product} user={user} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
