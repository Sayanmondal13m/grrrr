'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';

const sliderImages = [
  { src: 'https://placehold.co/1200x400.png', alt: 'Epic battle scene from Free Fire', dataAiHint: 'gaming battle' },
  { src: 'https://placehold.co/1200x400.png', alt: 'Promotional banner for new game items', dataAiHint: 'gaming characters' },
  { src: 'https://placehold.co/1200x400.png', alt: 'Close-up of a rare in-game weapon', dataAiHint: 'game weapon' },
];

export default function ImageSlider() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on('select', onSelect);

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  const scrollTo = React.useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  return (
    <section className="w-full py-6 md:py-8">
      <div className="container mx-auto px-4 md:px-6">
        <Carousel
          setApi={setApi}
          className="w-full group"
          plugins={[
            Autoplay({
              delay: 5000,
            }),
          ]}
          opts={{
            loop: true,
          }}
        >
          <CarouselContent>
            {sliderImages.map((image, index) => (
              <CarouselItem key={index}>
                <div className="relative h-[250px] md:h-[350px] lg:h-[400px] w-full overflow-hidden rounded-lg">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    data-ai-hint={image.dataAiHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/20 hover:bg-black/40 border-none hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity" />
          <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/20 hover:bg-black/40 border-none hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {sliderImages.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  current === index ? 'bg-primary' : 'bg-white/50'
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </Carousel>
      </div>
    </section>
  );
}
