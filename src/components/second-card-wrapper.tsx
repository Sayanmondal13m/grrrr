'use client';

import SecondCardDecoration from './second-card-decoration';

interface SecondCardWrapperProps {
  children: React.ReactNode;
  index: number;
}

export default function SecondCardWrapper({ children, index }: SecondCardWrapperProps) {
  if (index === 1) { // Apply to the second card (index is 0-based)
    return (
      <div className="relative">
        <SecondCardDecoration />
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
