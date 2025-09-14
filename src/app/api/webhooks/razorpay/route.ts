

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { type Product, type User, type Order, type LegacyUser } from '@/lib/definitions';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set.');
    return NextResponse.json({ success: false, message: 'Webhook secret not configured.' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  if (!signature) {
    return NextResponse.json({ success: false, message: 'Signature missing.' }, { status: 400 });
  }

  // 1. Verify the webhook signature
  try {
      const hmac = createHmac('sha256', WEBHOOK_SECRET);
      hmac.update(body);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== signature) {
          console.error('Invalid Razorpay webhook signature.');
          return NextResponse.json({ success: false, message: 'Invalid signature.' }, { status: 400 });
      }
  } catch (error) {
      console.error('Error during webhook signature verification:', error);
      return NextResponse.json({ success: false, message: 'Signature verification failed.' }, { status: 500 });
  }

  const payload = JSON.parse(body);

  // 2. Handle the correct payment event `payment_link.paid`
  if (payload.event === 'payment_link.paid') {
    const paymentLinkEntity = payload.payload.payment_link.entity;
    const paymentEntity = payload.payload.payment.entity;

    const { id: razorpayPaymentId } = paymentEntity;
    const { gamingId, productId } = paymentLinkEntity.notes;

    if (!productId || !gamingId) {
      console.error('Webhook payload missing productId or gamingId in notes');
      return NextResponse.json({ success: false, message: 'Missing required notes.' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    
    // 3. Check if order already exists to prevent duplicates
    const existingOrder = await db.collection<Order>('orders').findOne({ utr: razorpayPaymentId });
    if (existingOrder) {
        return NextResponse.json({ success: true, message: 'Order already processed.' });
    }

    const product = await db.collection<Product>('products').findOne({ _id: new ObjectId(productId) });
    const user = await db.collection<User>('users').findOne({ gamingId });

    if (!product || !user) {
        console.error(`Product or user not found for productId: ${productId}, gamingId: ${gamingId}`);
        return NextResponse.json({ success: false, message: 'Product or user not found.' }, { status: 404 });
    }

    const coinsUsed = product.isCoinProduct ? 0 : Math.min(user.coins, product.coinsApplicable || 0);
    const finalPrice = product.isCoinProduct ? product.purchasePrice || product.price : product.price - coinsUsed;
    const orderStatus = product.isCoinProduct ? 'Completed' : 'Processing';

    const newOrder: Omit<Order, '_id'> = {
        userId: user._id.toString(),
        gamingId,
        productId: product._id.toString(),
        productName: product.name,
        productPrice: product.price,
        productImageUrl: product.imageUrl,
        paymentMethod: 'UPI',
        status: orderStatus,
        utr: razorpayPaymentId, // Storing payment ID
        referralCode: user.referredByCode,
        coinsUsed,
        finalPrice,
        isCoinProduct: product.isCoinProduct,
        createdAt: new Date(),
        coinsAtTimeOfPurchase: user.coins,
    };
    
    try {
        const session = db.client.startSession();
        await session.withTransaction(async () => {
            await db.collection<Order>('orders').insertOne(newOrder as Order, { session });

            if (product.isCoinProduct) {
                await db.collection<User>('users').updateOne(
                    { _id: user._id },
                    { $inc: { coins: product.quantity } },
                    { session }
                );
            } else if (coinsUsed > 0) {
                await db.collection<User>('users').updateOne(
                    { _id: user._id },
                    { $inc: { coins: -coinsUsed } },
                    { session }
                );
            }
            
            if (orderStatus === 'Completed' && user.referredByCode) {
                 const rewardAmount = finalPrice * 0.50;
                 await db.collection<LegacyUser>('legacy_users').updateOne(
                    { referralCode: user.referredByCode },
                    { $inc: { walletBalance: rewardAmount } },
                    { session }
                );
            }
        });
        await session.endSession();
        
        // Revalidate paths to update frontend caches
        revalidatePath('/');
        revalidatePath('/order');
        revalidatePath('/admin');

    } catch (error) {
        console.error('Error processing webhook and creating order:', error);
        return NextResponse.json({ success: false, message: 'Database transaction failed.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: 'Webhook received.' });
}
