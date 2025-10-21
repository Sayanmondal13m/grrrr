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
    <div className="absolute -top-4 -right-4 z-10 drop-shadow-lg" style={{ transform: 'rotate(15deg)' }}>
        <div 
          className={cn(
            'relative bg-green-600 text-white',
            'text-xs font-bold uppercase tracking-wider',
            'px-3 py-1.5 rounded-md',
          )}
        >
          {tag}
        </div>
        {/* This creates the tail of the speech bubble */}
        <div className="absolute top-full right-2 w-0 h-0 border-t-[8px] border-t-green-600 border-l-[8px] border-l-transparent"></div>
    </div>
  );
}
