import ImageSlider from '@/components/image-slider';
import ProductCard from '@/components/product-card';
import FaqChatbot from '@/components/faq-chatbot';
import { getProducts, getUserData } from './actions';
import { type Metadata } from 'next';
import { type Product, type User } from '@/lib/definitions';
import GamingIdModal from '@/components/gaming-id-modal';
import CoinSystem from '@/components/coin-system';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.garenagears.com'),
  title: 'Garena Gears - Free Fire Top-Up & Diamonds',
  description: 'The official, secure, and trusted Garena store for discounted Free Fire diamonds, memberships, and top-ups. Get unbeatable prices on in-game items for Free Fire MAX.',
  keywords: [
    'Free Fire top up', 'Free Fire MAX top up', 'Garena', 'Free Fire diamonds', 'top-up', 'in-game items', 'Garena Gears', 'buy Free Fire diamonds', 'Free Fire recharge', 'Garena top up center', 'Free Fire membership', 'cheap Free Fire diamonds', 'how to top up Free Fire', 'Garena Free Fire', 'diamonds for Free Fire', 'game top up', 'Free Fire redeem code', 'Garena topup', 'FF top up',
  ],
  openGraph: {
    title: 'Garena Gears - Free Fire Top-Up & Diamonds',
    description: 'The official, secure, and trusted Garena store for discounted Free Fire diamonds and top-ups.',
    images: '/img/slider1.png'
  }
};


export default async function Home() {
  const products: Product[] = await getProducts();
  const user: User | null = await getUserData();

  return (
    <div className="flex flex-col">
      {!user && <GamingIdModal />}
      <ImageSlider />
      {user && <CoinSystem user={user} />}
      <section className="w-full py-12 md:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-center mb-8 md:mb-12 text-foreground">
            Purchase Item Now
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {products.map((product: Product) => (
              <ProductCard
                key={product._id}
                product={product}
                user={user}
              />
            ))}
          </div>
        </div>
      </section>
      <FaqChatbot />
    </div>
  );
}
