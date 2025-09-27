import { getAdSettings } from './actions';
import AdManager from './_components/ad-manager';
import { unstable_noStore as noStore } from 'next/cache';

export default async function CustomAdsPage() {
  noStore();
  const adSettings = await getAdSettings();
  
  return <AdManager initialAdSettings={adSettings} />;
}
