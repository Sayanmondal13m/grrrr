'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Event } from '@/lib/definitions';
import Image from 'next/image';
import { X } from 'lucide-react';

interface EventModalProps {
  event: Event;
  onClose: () => void;
}

export default function EventModal({ event, onClose }: EventModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="p-0 border-0 max-w-2xl bg-transparent shadow-none" hideCloseButton={true}>
        <div className="relative aspect-video">
            <Image src={event.imageUrl} alt="Event" layout="fill" className="object-contain" />
        </div>
         <button onClick={onClose} className="absolute -top-2 -right-2 rounded-full bg-background/80 p-1 text-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
