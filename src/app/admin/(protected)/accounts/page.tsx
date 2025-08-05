import AccountList from './_components/account-list';
import { getLegacyUsersForAdmin } from '@/app/actions';

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'asc';
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';

  const { users, hasMore } = await getLegacyUsersForAdmin(page, sort, search);

  return (
    <AccountList
      initialUsers={JSON.parse(JSON.stringify(users))}
      initialHasMore={hasMore}
    />
  );
}
