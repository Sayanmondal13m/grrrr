
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/definitions';
import AccountList from './_components/account-list';
import { isAdminAuthenticated } from '@/app/actions';
import { redirect } from 'next/navigation';

const PAGE_SIZE = 5;

async function getUsersForPage(page: number, sort: string, search: string) {
  'use server';
  const db = await connectToDatabase();
  const skip = (page - 1) * PAGE_SIZE;

  let query: any = {};
  if (search) {
    query.referralCode = search;
  }
  
  const users = await db.collection<User>('users')
    .find(query)
    .sort({ createdAt: sort === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .toArray();

  const totalUsers = await db.collection('users').countDocuments(query);
  const hasMore = skip + users.length < totalUsers;

  return { users: JSON.parse(JSON.stringify(users)), hasMore };
}

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) redirect('/admin/login');

  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'asc';
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';

  const { users } = await getUsersForPage(page, sort, search);

  return (
    <AccountList
      initialUsers={users}
      getMoreUsers={getUsersForPage}
    />
  );
}
