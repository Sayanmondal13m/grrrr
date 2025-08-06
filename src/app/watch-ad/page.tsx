'use client';

import { useState, useEffect, FC, useRef } from 'react';
import { useRouter } from 'next/navigation';
// Make sure to adjust the import paths if they are different in your project structure
import { rewardAdCoins } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PartyPopper } from 'lucide-react';

/**
 * AdUnit Component
 * This component is designed to safely render Adsterra's standard iframe ads.
 * It uses a useEffect hook to manually create and append the ad scripts to the DOM.
 * This ensures that each ad's configuration and invocation scripts are loaded together
 * in their own container, preventing conflicts with other ads on the same page.
 */
interface AdUnitProps {
  adKey: string;
  height: number;
  width: number;
  className?: string;
}

const AdUnit: FC<AdUnitProps> = ({ adKey, height, width, className = '' }) => {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure the container is available before trying to inject scripts
    if (!adContainerRef.current) return;

    // Clear any previous ad scripts in case of a re-render
    adContainerRef.current.innerHTML = '';

    // Create a container div for the scripts to live in.
    // This helps encapsulate the ad.
    const adElement = document.createElement('div');
    
    // Create the configuration script
    const optionsScript = document.createElement('script');
    optionsScript.type = 'text/javascript';
    optionsScript.innerHTML = `
      atOptions = {
        'key' : '${adKey}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    `;

    // Create the script that invokes the ad
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    // The 'src' attribute triggers the script loading
    invokeScript.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
    
    // Append the scripts to our ad element
    adElement.appendChild(optionsScript);
    adElement.appendChild(invokeScript);

    // Append the ad element to the component's root div
    adContainerRef.current.appendChild(adElement);

    // A cleanup function to remove the ad when the component unmounts
    return () => {
      if (adContainerRef.current) {
        adContainerRef.current.innerHTML = '';
      }
    };
    // Re-run this effect if the ad details change
  }, [adKey, height, width]);

  return (
    <div 
      ref={adContainerRef} 
      className={className} 
      // Set min dimensions to reserve space for the ad while it loads
      style={{ minWidth: `${width}px`, minHeight: `${height}px` }}
    ></div>
  );
};


/**
 * BannerAdUnit Component
 * This component handles the specific banner-type ad.
 * It follows a similar pattern to AdUnit for safe script injection.
 */
interface BannerAdUnitProps {
    adSrc: string;
    containerId: string;
    className?: string;
}

const BannerAdUnit: FC<BannerAdUnitProps> = ({ adSrc, containerId, className = '' }) => {
    const adContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!adContainerRef.current) return;
        adContainerRef.current.innerHTML = ''; // Clear on re-render

        // This ad type requires a specific div with an ID for the ad to be placed into
        const containerDiv = document.createElement('div');
        containerDiv.id = containerId;

        // The script that finds the div above and injects the ad
        const invokeScript = document.createElement('script');
        invokeScript.async = true;
        invokeScript.setAttribute('data-cfasync', 'false');
        invokeScript.src = adSrc;

        // Append the script and the container div to the DOM
        adContainerRef.current.appendChild(invokeScript);
        adContainerRef.current.appendChild(containerDiv);

        return () => {
            if(adContainerRef.current) {
                adContainerRef.current.innerHTML = '';
            }
        }
    }, [adSrc, containerId]);

    return <div ref={adContainerRef} className={className}></div>;
};


export default function WatchAdPage() {
  const [countdown, setCountdown] = useState(30);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // This effect prevents the user from accidentally closing the tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isComplete) {
        e.preventDefault();
        e.returnValue = ''; // Required for cross-browser compatibility
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isComplete]);

  // This effect handles the countdown timer and the reward logic
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!isComplete) {
      // Countdown finished, grant the reward
      setIsComplete(true);
      rewardAdCoins().then(result => {
        if (result.success) {
          toast({
            title: 'Success!',
            description: result.message || "You've earned 5 coins!",
            duration: 5000,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message || 'Could not process reward.',
            duration: 5000,
          });
        }
        // Redirect back to home page after a 3-second delay
        setTimeout(() => {
            router.push('/');
        }, 3000);
      });
    }
  }, [countdown, isComplete, router, toast]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-white text-gray-800 p-4 space-y-4">
        
        {/* Top Ad Area */}
        <div className="w-full flex justify-center">
            <AdUnit 
                adKey="e5b06b6c887386a38272660193a86588" 
                height={90} 
                width={728}
            />
        </div>

        {/* Middle Section: Ads and Countdown */}
        <div className="flex flex-row flex-wrap items-center justify-center gap-8 w-full">
            
            {/* Left Ad Area */}
            <AdUnit 
                adKey="3073ffce1733b0713b07dea5aa3aa6e4" 
                height={250} 
                width={300}
            />

            {/* Main Content: Countdown or Completion Message */}
            <div className="text-center space-y-6 my-4 md:my-0 flex-shrink-0 order-first md:order-none">
                {isComplete ? (
                    <div className="space-y-4">
                        <PartyPopper className="w-24 h-24 text-yellow-400 mx-auto animate-bounce" />
                        <h1 className="text-4xl font-bold">Ad Finished!</h1>
                        <p className="text-lg">You've earned your reward!</p>
                        <p className="text-sm text-gray-500">Redirecting you back to the homepage...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative w-28 h-28 mx-auto">
                            <Loader2 className="w-28 h-28 text-blue-600 animate-spin" />
                            <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold">
                                {countdown}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-wider">Your Ad Is Playing...</h1>
                        <p className="text-gray-600 max-w-sm">
                            Please wait for the countdown to finish to receive your reward. Do not close or refresh this page.
                        </p>
                    </div>
                )}
            </div>

            {/* Right Ad Area */}
             <AdUnit 
                adKey="3073ffce1733b0713b07dea5aa3aa6e4" 
                height={250} 
                width={300}
            />
        </div>

        {/* Bottom Ad Area */}
        <div className="w-full flex justify-center">
            <AdUnit 
                adKey="d03db8034121e832dbc841f6b4b0fb1c" 
                height={60} 
                width={468}
            />
        </div>

        {/* Bottom Banner Ad Area */}
        <div className="w-full flex justify-center">
            <BannerAdUnit
                adSrc="//pl27351902.profitableratecpm.com/d990b9916919f0f255fc4e310f7c9793/invoke.js"
                containerId="container-d990b9916919f0f255fc4e310f7c9793"
            />
        </div>
    </div>
  );
}
