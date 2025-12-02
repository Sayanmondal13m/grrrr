import { getBannedUsers } from './actions';
import BannedUserList from './_components/banned-user-list';
import { unstable_noStore as noStore } from 'next/cache';

export default async function BannedUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  noStore();
  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'desc';

  const { users, hasMore, totalUsers } = await getBannedUsers(page, search, sort);

  return (
    <BannedUserList
      initialUsers={users}
      initialHasMore={hasMore}
      totalUsers={totalUsers}
    />
  );
}
