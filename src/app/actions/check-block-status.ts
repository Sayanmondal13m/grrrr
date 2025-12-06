
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { headers, cookies } from 'next/headers';
import type { BlockedIdentifier } from '@/lib/definitions';

export async function checkBlockStatus(): Promise<{ isBlocked: boolean; reason: string | null }> {
  try {
    const forwardedFor = headers().get('x-forwarded-for');
    const realIp = headers().get('x-real-ip');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : realIp;
    
    const fingerprintCookie = cookies().get('fingerprint')?.value;
    
    if (!ip && !fingerprintCookie) {
      return { isBlocked: false, reason: null };
    }

    const db = await connectToDatabase();
    
    const queryConditions = [];
    if (ip) {
        queryConditions.push({ type: 'ip', value: ip });
    }
    if (fingerprintCookie) {
        queryConditions.push({ type: 'fingerprint', value: fingerprintCookie });
    }

    if (queryConditions.length === 0) {
        return { isBlocked: false, reason: null };
    }

    const block = await db.collection<BlockedIdentifier>('blocked_identifiers').findOne({
      $or: queryConditions
    });

    if (block) {
      return { isBlocked: true, reason: block.reason };
    }

    return { isBlocked: false, reason: null };
  } catch (error) {
    console.error('Error checking block status:', error);
    // Fail open: if the check fails, don't block the user.
    return { isBlocked: false, reason: null };
  }
}
