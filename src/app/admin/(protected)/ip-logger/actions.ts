
'use server';

import { isAdminAuthenticated } from '@/app/actions';
import { User } from '@/lib/definitions';
import { connectToDatabase } from '@/lib/mongodb';
import { unstable_noStore as noStore } from 'next/cache';

const PAGE_SIZE = 20;

export async function getIpHistory(page: number, searchId: string, searchIp: string) {
    noStore();
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
        return { users: [], hasMore: false, totalUsers: 0 };
    }

    const db = await connectToDatabase();
    const skip = (page - 1) * PAGE_SIZE;

    let query: any = { ipHistory: { $exists: true, $not: { $size: 0 } } };

    if (searchId) {
        query.gamingId = { $regex: searchId, $options: 'i' };
    }
    if (searchIp) {
        query['ipHistory.ip'] = { $regex: searchIp.replace(/\./g, '\\.'), $options: 'i' };
    }

    const usersFromDb = await db.collection<User>('users')
        .find(query)
        .sort({ 'ipHistory.timestamp': -1 }) // Sort by most recent IP entry
        .skip(skip)
        .limit(PAGE_SIZE)
        .project({ gamingId: 1, ipHistory: 1, fingerprintHistory: 1 }) // Also fetch fingerprint history
        .toArray();
    
    const totalUsers = await db.collection('users').countDocuments(query);
    const hasMore = skip + usersFromDb.length < totalUsers;
    const users = JSON.parse(JSON.stringify(usersFromDb));

    return { users, hasMore, totalUsers };
}

export async function searchUsersByIp(ip: string) {
     noStore();
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
        return { users: [] };
    }
    const db = await connectToDatabase();
    const usersFromDb = await db.collection<User>('users')
        .find({ 'ipHistory.ip': ip })
        .project({ gamingId: 1 })
        .toArray();

    return { users: JSON.parse(JSON.stringify(usersFromDb)) };
}
