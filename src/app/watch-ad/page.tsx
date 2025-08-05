'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { rewardAdCoins } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PartyPopper } from 'lucide-react';

export default function WatchAdPage() {
  const [countdown, setCountdown] = useState(10);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Prevent closing the tab
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isComplete) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isComplete]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!isComplete) {
      // Countdown finished
      setIsComplete(true);
      rewardAdCoins().then(result => {
        if (result.success) {
          toast({
            title: 'Success!',
            description: result.message,
            duration: 5000,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
            duration: 5000,
          });
        }
        // Redirect back to home page after a delay
        setTimeout(() => {
            router.push('/');
        }, 3000);
      });
    }
  }, [countdown, isComplete, router, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        {isComplete ? (
            <div className="text-center space-y-4">
                <PartyPopper className="w-24 h-24 text-yellow-400 mx-auto animate-bounce" />
                <h1 className="text-4xl font-bold">Ad Finished!</h1>
                <p className="text-lg">You've earned 5 coins!</p>
                <p className="text-sm text-gray-400">Redirecting you back to the homepage...</p>
            </div>
        ) : (
            <div className="text-center space-y-6">
                <div className="relative">
                    <Loader2 className="w-20 h-20 text-primary animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
                        {countdown}
                    </span>
                </div>
                <h1 className="text-3xl font-bold tracking-wider">Your Ad Is Playing...</h1>
                <p className="text-gray-300 max-w-sm">
                    Please wait for the countdown to finish to receive your reward. Do not close or refresh this page.
                </p>
            </div>
        )}
    </div>
  );
}
