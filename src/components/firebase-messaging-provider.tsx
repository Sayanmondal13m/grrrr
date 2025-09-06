'use client';

import { useEffect } from 'react';
import { getMessaging } from 'firebase/messaging';
import { getToken } from 'firebase/messaging';
import { app } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { saveFcmToken } from '@/app/actions';

export default function FirebaseMessagingProvider({children}: {children: React.ReactNode}) {
  const { toast } = useToast();

  useEffect(() => {
    const requestPermission = async () => {
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const messaging = getMessaging(app);
          
          // Wait for the service worker to be ready
          const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          
          const permission = await Notification.requestPermission();
          
          if (permission === 'granted') {
            const currentToken = await getToken(messaging, { 
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                serviceWorkerRegistration: swRegistration 
            });
            if (currentToken) {
              await saveFcmToken(currentToken);
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          } else {
            console.log('Unable to get permission to notify.');
          }
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
        toast({
          variant: 'destructive',
          title: 'Notification Error',
          description: 'Could not set up push notifications.',
        });
      }
    };

    const hasSeenPermissionPrompt = localStorage.getItem('seenNotificationPrompt');
    if (!hasSeenPermissionPrompt) {
        requestPermission();
        localStorage.setItem('seenNotificationPrompt', 'true');
    }
    
  }, [toast]);
  
  return <>{children}</>;
}
