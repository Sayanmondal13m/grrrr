
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { headers, cookies } from 'next/headers';
import type { BlockedIdentifier } from '@/lib/definitions';

/**
 * Checks if a specific fingerprint ID is in the blocklist.
 * This is called from the client after the fingerprint has been generated.
 * @param fingerprint - The visitor ID from FingerprintJS.
 * @returns An object indicating if blocked and the reason.
 */
export async function checkAndBlockFingerprint(fingerprint: string): Promise<{ isBlocked: boolean; reason: string | null }> {
  if (!fingerprint) {
    return { isBlocked: false, reason: null };
  }
  try {
    const db = await connectToDatabase();
    const block = await db.collection<BlockedIdentifier>('blocked_identifiers').findOne({
      type: 'fingerprint',
      value: fingerprint,
    });

    if (block) {
      return { isBlocked: true, reason: block.reason };
    }

    return { isBlocked: false, reason: null };
  } catch (error) {
    console.error('Error checking fingerprint block status:', error);
    return { isBlocked: false, reason: null };
  }
}


export async function checkBlockStatus(): Promise<{ isBlocked: boolean; reason: string | null }> {
  try {
    const forwardedFor = headers().get('x-forwarded-for');
    const realIp = headers().get('x-real-ip');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : realIp;
    
    // Fingerprint check is now handled by checkAndBlockFingerprint
    if (!ip) {
      return { isBlocked: false, reason: null };
    }

    const db = await connectToDatabase();
    
    const block = await db.collection<BlockedIdentifier>('blocked_identifiers').findOne({
      type: 'ip', value: ip
    });

    if (block) {
      return { isBlocked: true, reason: block.reason };
    }

    return { isBlocked: false, reason: null };
  } catch (error) {
    console.error('Error checking IP block status:', error);
    // Fail open: if the check fails, don't block the user.
    return { isBlocked: false, reason: null };
  }
}
