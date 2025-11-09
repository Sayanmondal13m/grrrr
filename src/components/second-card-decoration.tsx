'use client';

import Image from 'next/image';

export default function SecondCardDecoration() {
  return (
    <div className="absolute -top-8 -left-8 z-10 w-24 h-24 pointer-events-none">
      <Image
        src="https://res.cloudinary.com/dlvoikod1/image/upload/v1762668141/images__1_-removebg-preview_fylmgh.png"
        alt="Card Decoration"
        width={96}
        height={96}
        className="object-contain"
      />
    </div>
  );
}
