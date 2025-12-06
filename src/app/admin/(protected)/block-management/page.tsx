
import { unstable_noStore as noStore } from 'next/cache';
import BlockManager from './_components/block-manager';
import { getBlockedIdentifiers } from './actions';

export default async function BlockManagementPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  noStore();
  const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
  const search = typeof searchParams.search === 'string' ? searchParams.search : '';

  const { blockedItems, hasMore, total } = await getBlockedIdentifiers(page, search);

  return (
    <BlockManager
      initialBlockedItems={blockedItems}
      initialHasMore={hasMore}
      total={total}
    />
  );
}
