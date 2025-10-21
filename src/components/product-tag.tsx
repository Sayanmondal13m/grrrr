'use client';

import { cn } from '@/lib/utils';

interface ProductTagProps {
  tag: string;
}

export default function ProductTag({ tag }: ProductTagProps) {
  if (!tag) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute -top-3 -right-3 z-10',
        'bg-green-600 text-white',
        'text-xs font-bold uppercase tracking-wider',
        'px-3 py-1',
        'rounded-full shadow-lg',
        'transform rotate-12',
        'relative overflow-hidden animate-glowing-ray'
      )}
    >
      {tag}
    </div>
  );
}
