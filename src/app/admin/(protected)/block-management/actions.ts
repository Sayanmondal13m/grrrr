
'use server';

import { isAdminAuthenticated } from '@/app/actions';
import { BlockedIdentifier } from '@/lib/definitions';
import { connectToDatabase } from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { unstable_noStore as noStore } from 'next/cache';
import { ObjectId } from 'mongodb';

const blockSchema = z.object({
  type: z.enum(['ip', 'fingerprint']),
  value: z.string().min(1, 'Value is required.'),
  reason: z.string().min(1, 'A reason is required to block.'),
});

const PAGE_SIZE = 10;

export async function addBlock(formData: FormData): Promise<{ success: boolean; message: string }> {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return { success: false, message: 'Unauthorized' };

  const validated = blockSchema.safeParse(Object.fromEntries(formData));

  if (!validated.success) {
    return { success: false, message: validated.error.errors.map(e => e.message).join(', ') };
  }

  const { type, value, reason } = validated.data;

  try {
    const db = await connectToDatabase();
    
    const existingBlock = await db.collection<BlockedIdentifier>('blocked_identifiers').findOne({ value });
    if (existingBlock) {
        return { success: false, message: 'This IP or Fingerprint is already blocked.' };
    }

    const newBlock: Omit<BlockedIdentifier, '_id'> = {
      type,
      value,
      reason,
      createdAt: new Date(),
    };

    await db.collection<BlockedIdentifier>('blocked_identifiers').insertOne(newBlock as BlockedIdentifier);

    revalidatePath('/admin/block-management');
    return { success: true, message: 'Identifier blocked successfully.' };
  } catch (error) {
    console.error('Error adding block:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

export async function removeBlock(id: string): Promise<{ success: boolean; message: string }> {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return { success: false, message: 'Unauthorized' };

  try {
    const db = await connectToDatabase();
    const result = await db.collection<BlockedIdentifier>('blocked_identifiers').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return { success: false, message: 'Block not found.' };
    }
    revalidatePath('/admin/block-management');
    return { success: true, message: 'Block removed successfully.' };
  } catch (error) {
    console.error('Error removing block:', error);
    return { success: false, message: 'An error occurred.' };
  }
}

export async function getBlockedIdentifiers(page: number, search: string) {
  noStore();
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) return { blockedItems: [], hasMore: false, total: 0 };
  
  try {
    const db = await connectToDatabase();
    const skip = (page - 1) * PAGE_SIZE;

    let query: any = {};
    if (search) {
      query.value = { $regex: search, $options: 'i' };
    }

    const blockedItems = await db.collection<BlockedIdentifier>('blocked_identifiers')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .toArray();

    const total = await db.collection('blocked_identifiers').countDocuments(query);
    const hasMore = skip + blockedItems.length < total;

    return { blockedItems: JSON.parse(JSON.stringify(blockedItems)), hasMore, total };

  } catch (error) {
    console.error('Error fetching blocked identifiers:', error);
    return { blockedItems: [], hasMore: false, total: 0 };
  }
}
