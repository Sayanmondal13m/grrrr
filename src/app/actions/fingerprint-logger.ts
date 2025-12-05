
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/definitions';
import { cookies } from 'next/headers';

/**
 * Logs the current user's device fingerprint to their user document.
 */
export async function logUserFingerprint(fingerprint: string) {
  const gamingId = cookies().get('gaming_id')?.value;
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
