
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/definitions';
import { cookies } from 'next/headers';

/**
 * Logs the current user's device fingerprint to their user document.
 */
export async function logUserFingerprint(fingerprint: string) {
  const gamingId = cookies().get('gaming_id')?.value;
  
  // Set a cookie with the fingerprint so it can be checked even if user is not logged in.
  if (fingerprint) {
    cookies().set('fingerprint', fingerprint, { maxAge: 365 * 24 * 60 * 60, httpOnly: true });
  }
  
  if (!gamingId || !fingerprint) {
    return; // No user logged in or no fingerprint generated.
  }

  try {
    const db = await connectToDatabase();
    
    const fingerprintHistoryEntry = {
        fingerprint,
        timestamp: new Date(),
    };

    await db.collection<User>('users').updateOne(
      { gamingId },
      { $push: { fingerprintHistory: fingerprintHistoryEntry } }
    );
  } catch (error) {
    // Log the error but don't crash the request, as this is a background task.
    console.error('Failed to log user fingerprint:', error);
  }
}
