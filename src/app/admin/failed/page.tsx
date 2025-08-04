
import { OrderList } from '../_components/order-list';
import { connectToDatabase } from '@/lib/mongodb';
import { Order } from '@/lib/definitions';
import { isAdminAuthenticated } from '@/app/actions';
import { redirect } from 'next/navigation';

const PAGE_SIZE = 5;

async function getOrdersForPage(page: number, sort: string, search: string) {
  'use server';
  const db = await connectToDatabase();
  const skip = (page - 1) * PAGE_SIZE;
  const status = ['Failed'];

  let query: any = { status: { $in: status } };
  if (search) {
      query.referralCode = search;
  }

  const orders = await db.collection<Order>('orders')
      .find(query)
      .sort({ createdAt: sort === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .toArray();

  const totalOrders = await db.collection('orders').countDocuments(query);
  const hasMore = skip + orders.length < totalOrders;
  return { orders: JSON.parse(JSON.stringify(orders)), hasMore };
}


export default async function AdminFailedPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) redirect('/admin/login');

  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'asc';
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';

  const { orders } = await getOrdersForPage(page, sort, search);

  return (
    <OrderList
      initialOrders={orders}
      title="Failed Orders"
      status={['Failed']}
      getMoreOrders={getOrdersForPage}
    />
  );
}
