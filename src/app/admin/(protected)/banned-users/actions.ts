'use server';

import { isAdminAuthenticated, unbanUser } from '@/app/actions';
import { User } from '@/lib/definitions';
import { connectToDatabase } from '@/lib/mongodb';
import { unstable_noStore as noStore } from 'next/cache';

const PAGE_SIZE = 10;

export async function getBannedUsers(page: number, search: string, sort: string) {
    noStore();
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
        return { users: [], hasMore: false, totalUsers: 0 };
    }

    const db = await connectToDatabase();
    const skip = (page - 1) * PAGE_SIZE;

    let query: any = { isBanned: true };
    if (search) {
        query.gamingId = { $regex: search, $options: 'i' };
    }

    const usersFromDb = await db.collection<User>('users')
        .find(query)
        .sort({ bannedAt: sort === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .toArray();

    const totalUsers = await db.collection('users').countDocuments(query);
    const hasMore = skip + usersFromDb.length < totalUsers;
    const users = JSON.parse(JSON.stringify(usersFromDb));

    return { users, hasMore, totalUsers };
}

export { unbanUser };
