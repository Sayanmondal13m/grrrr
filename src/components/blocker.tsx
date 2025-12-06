
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { checkBlockStatus } from '@/app/actions/check-block-status';

export default function Blocker() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const performCheck = async () => {
      // Don't run the check on admin pages or the blocked page itself
      if (pathname.startsWith('/admin') || pathname === '/blocked') {
        return;
      }
      
      const { isBlocked, reason } = await checkBlockStatus();
      if (isBlocked) {
        const url = `/blocked?reason=${encodeURIComponent(reason || 'Your access has been restricted.')}`;
        router.replace(url);
      }
    };
    
    // Run the check after the initial page content has had a chance to load.
    const timer = setTimeout(performCheck, 500);

    return () => clearTimeout(timer);
  }, [pathname, router]);

  return null; // This component does not render anything
}
