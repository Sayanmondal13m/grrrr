'use client';

import Image from 'next/image';

interface ProductMediaProps {
  src: string;
  alt: string;
  dataAiHint?: string;
}

export default function ProductMedia({ src, alt, dataAiHint }: ProductMediaProps) {
  const isVideo = src.endsWith('.mp4') || src.endsWith('.webm');

  if (isVideo) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      data-ai-hint={dataAiHint}
    />
  );
}
