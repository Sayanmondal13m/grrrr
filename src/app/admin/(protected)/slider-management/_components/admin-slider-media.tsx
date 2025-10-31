
'use client';

import Image from 'next/image';

interface AdminSliderMediaProps {
  src: string;
  alt: string;
}

export default function AdminSliderMedia({ src, alt }: AdminSliderMediaProps) {
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
    />
  );
}
