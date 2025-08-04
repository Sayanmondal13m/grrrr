'use server';

import { customerFAQChatbot, type CustomerFAQChatbotInput } from '@/ai/flows/customer-faq-chatbot';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { type User, type Order, type Product, type Withdrawal } from '@/lib/definitions';
import { randomBytes } from 'crypto';
import { ensureUserId } from '@/lib/user-actions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';

const key = new TextEncoder().encode(process.env.SESSION_SECRET || 'your-fallback-secret-for-session');


export async function askQuestion(
  input: CustomerFAQChatbotInput
): Promise<{ success: boolean; answer?: string; error?: string }> {
  try {
    const result = await customerFAQChatbot(input);
    return { success: true, answer: result.answer };
  } catch (error) {
    console.error('Error in askQuestion action:', error);
    return { success: false, error: 'Sorry, I am unable to answer at the moment. Please try again later.' };
  }
}

type FormState = {
  success: boolean;
  message: string;
};

// --- Authentication Actions ---

const accountSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});


async function createSession(username: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(key);

  cookies().set('session', session, { expires, httpOnly: true });
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  try {
    const { payload } = await jwtVerify(sessionCookie, key, {
      algorithms: ['HS256'],
    });
    return payload as { username: string; iat: number; exp: number };
  } catch (error) {
    return null;
  }
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) });
  redirect('/account');
}

export async function createAccount(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = accountSchema.safeParse(Object.fromEntries(formData.entries()));
  const referralCode = cookies().get('referral_code')?.value;

  if (!validatedFields.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  const { username, password } = validatedFields.data;

  try {
    const db = await connectToDatabase();
    const existingUser = await db.collection<User>('users').findOne({ username });

    if (existingUser) {
      return { success: false, message: 'Username already exists.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser: Omit<User, '_id' | 'createdAt'> = { username, password: hashedPassword, walletBalance: 0, createdAt: new Date() };

    if (referralCode) {
        const referringUser = await db.collection<User>('users').findOne({ referralCode });
        if (referringUser) {
            newUser.referredBy = referringUser.username;
        }
        // Clear the cookie after use
        cookies().delete('referral_code');
    }

    await db.collection('users').insertOne(newUser);

    await createSession(username);
    revalidatePath('/account');
    return { success: true, message: 'Account created successfully!' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

export async function login(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = accountSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  const { username, password } = validatedFields.data;

  try {
    const db = await connectToDatabase();
    const user = await db.collection<User>('users').findOne({ username });

    if (!user) {
      return { success: false, message: 'Incorrect username or password.' };
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return { success: false, message: 'Incorrect username or password.' };
    }

    await createSession(username);
    revalidatePath('/account');
    return { success: true, message: 'Logged in successfully!' };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});

export async function changePassword(prevState: FormState, formData: FormData): Promise<FormState> {
    const session = await getSession();
    if (!session?.username) {
        return { success: false, message: 'You must be logged in to change your password.' };
    }

    const validatedFields = passwordChangeSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid form data.' };
    }
    
    const { oldPassword, newPassword } = validatedFields.data;

    try {
        const db = await connectToDatabase();
        const user = await db.collection<User>('users').findOne({ username: session.username });

        if (!user) {
            return { success: false, message: 'User not found.' };
        }

        const passwordsMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordsMatch) {
            return { success: false, message: 'Incorrect old password.' };
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.collection('users').updateOne({ username: session.username }, { $set: { password: hashedNewPassword } });
        
        return { success: true, message: 'Password changed successfully!' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}

const usernameChangeSchema = z.object({
    newUsername: z.string().min(3, "New username must be at least 3 characters long"),
    password: z.string().min(1, "Password is required"),
});

export async function changeUsername(prevState: FormState, formData: FormData): Promise<FormState> {
    const session = await getSession();
    if (!session?.username) {
        return { success: false, message: 'You must be logged in to change your username.' };
    }

    const validatedFields = usernameChangeSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid form data.' };
    }

    const { newUsername, password } = validatedFields.data;

    try {
        const db = await connectToDatabase();

        const existingNewUser = await db.collection<User>('users').findOne({ username: newUsername });
        if (existingNewUser) {
            return { success: false, message: 'New username is already taken.' };
        }
        
        const currentUser = await db.collection<User>('users').findOne({ username: session.username });

        if (!currentUser) {
            return { success: false, message: 'Current user not found.' };
        }

        const passwordsMatch = await bcrypt.compare(password, currentUser.password);
        if (!passwordsMatch) {
            return { success: false, message: 'Incorrect password.' };
        }

        await db.collection('users').updateOne({ username: session.username }, { $set: { username: newUsername } });
        
        // Create a new session with the new username
        await createSession(newUsername);
        revalidatePath('/account');
        return { success: true, message: 'Username changed successfully!' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}

// --- Referral Actions ---

export async function generateReferralLink(): Promise<{ success: boolean; link?: string; message: string }> {
    const session = await getSession();
    if (!session?.username) {
        return { success: false, message: 'You must be logged in.' };
    }

    try {
        const db = await connectToDatabase();
        const user = await db.collection<User>('users').findOne({ username: session.username });

        if (!user) {
            return { success: false, message: 'User not found.' };
        }
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

        if (user.referralCode) {
            const link = `${baseUrl}/?ref=${user.referralCode}`;
            return { success: true, link, message: 'Your existing referral link.' };
        }

        const referralCode = randomBytes(4).toString('hex'); // 8 characters
        await db.collection('users').updateOne(
            { username: session.username },
            { $set: { referralCode } }
        );

        const link = `${baseUrl}/?ref=${referralCode}`;
        revalidatePath('/account');
        return { success: true, link, message: 'Referral link generated successfully!' };

    } catch (error) {
        console.error(error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}

// --- Order Actions ---

const createOrderSchema = z.object({
    gamingId: z.string().min(1, 'Gaming ID is required'),
    productId: z.string(),
    productName: z.string(),
    productPrice: z.number(),
    productImageUrl: z.string().url(),
});

export async function createUpiOrder(product: Product, gamingId: string): Promise<{ success: boolean; orderId?: string; message: string }> {
    const validatedData = createOrderSchema.safeParse({
        gamingId,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productImageUrl: product.imageUrl,
    });

    if (!validatedData.success) {
        return { success: false, message: 'Invalid order data.' };
    }

    const userId = await ensureUserId();
    const referralCode = cookies().get('referral_code')?.value;

    const newOrder: Omit<Order, '_id'> = {
        userId,
        gamingId: validatedData.data.gamingId,
        productId: validatedData.data.productId,
        productName: validatedData.data.productName,
        productPrice: validatedData.data.productPrice,
        productImageUrl: validatedData.data.productImageUrl,
        paymentMethod: 'UPI',
        status: 'Pending UTR',
        referralCode: referralCode,
        createdAt: new Date(),
    };

    try {
        const db = await connectToDatabase();
        const result = await db.collection<Omit<Order, '_id'>>('orders').insertOne(newOrder);
        return { success: true, orderId: result.insertedId.toString(), message: 'Order created.' };
    } catch (error) {
        console.error('Error creating UPI order:', error);
        return { success: false, message: 'Failed to create order.' };
    }
}


const redeemCodeSchema = z.object({
  gamingId: z.string().min(1, 'Gaming ID is required'),
  productId: z.string(),
  redeemCode: z.string().min(1, 'Redeem code is required'),
});

export async function createRedeemCodeOrder(
  product: Product,
  gamingId: string,
  redeemCode: string
): Promise<{ success: boolean; message: string }> {
    const validatedData = redeemCodeSchema.safeParse({ gamingId, productId: product.id, redeemCode });
    if (!validatedData.success) {
        return { success: false, message: 'Invalid data provided.' };
    }
    
    // In a real app, you would validate the redeem code here.
    // For this example, we'll assume any code is valid.

    const userId = await ensureUserId();
    const referralCode = cookies().get('referral_code')?.value;

    const newOrder: Omit<Order, '_id'> = {
        userId,
        gamingId: validatedData.data.gamingId,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productImageUrl: product.imageUrl,
        paymentMethod: 'Redeem Code',
        status: 'Processing',
        redeemCode: validatedData.data.redeemCode,
        referralCode: referralCode,
        createdAt: new Date(),
    };

    try {
        const db = await connectToDatabase();
        await db.collection('orders').insertOne(newOrder);
        return { success: true, message: 'Order is processing.' };
    } catch (error) {
        console.error('Error creating redeem code order:', error);
        return { success: false, message: 'Failed to create order.' };
    }
}

const submitUtrSchema = z.object({
    orderId: z.string(),
    utr: z.string().min(6, 'UTR must be at least 6 characters'),
});

export async function submitUtr(orderId: string, utr: string): Promise<{ success: boolean; message: string }> {
    const validatedData = submitUtrSchema.safeParse({ orderId, utr });
    if (!validatedData.success) {
        return { success: false, message: 'Invalid UTR data.' };
    }

    const { ObjectId } = await import('mongodb');

    try {
        const db = await connectToDatabase();
        const result = await db.collection('orders').updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { utr: validatedData.data.utr, status: 'Processing' } }
        );

        if (result.modifiedCount === 0) {
            return { success: false, message: 'Order not found or already updated.' };
        }

        return { success: true, message: 'UTR submitted successfully.' };
    } catch (error) {
        console.error('Error submitting UTR:', error);
        return { success: false, message: 'Failed to submit UTR.' };
    }
}

// --- Admin Actions ---
type AdminFormState = {
  message: string;
  success: boolean;
};

export async function verifyAdminPassword(prevState: AdminFormState, formData: FormData): Promise<FormState> {
  const password = formData.get('password') as string;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable not set.');
    return { message: 'Admin password not configured.', success: false };
  }
  
  const isValid = password === adminPassword;

  if (isValid) {
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    cookies().set('admin_session', 'true', { expires, httpOnly: true, sameSite: 'strict', path: '/' });
    revalidatePath('/admin', 'layout');
    redirect('/admin');
  } else {
    return { message: 'Incorrect password.', success: false };
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  noStore();
  const session = cookies().get('admin_session')?.value;
  return session === 'true';
}

export async function logoutAdmin() {
    cookies().set('admin_session', '', { expires: new Date(0) });
    redirect('/admin/login');
}

export async function updateOrderStatus(orderId: string, status: 'Completed' | 'Failed'): Promise<{success: boolean}> {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
        return { success: false };
    }

    const { ObjectId } = await import('mongodb');
    const db = await connectToDatabase();
    
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    if (!order) {
        return { success: false };
    }

    // If order is completed and has a referral code, credit the referring user
    if (status === 'Completed' && order.referralCode) {
        const referringUser = await db.collection<User>('users').findOne({ referralCode: order.referralCode });
        if (referringUser) {
            const reward = order.productPrice * 0.5;
            await db.collection('users').updateOne(
                { _id: referringUser._id },
                { $inc: { walletBalance: reward } }
            );
        }
    }

    await db.collection('orders').updateOne({ _id: new ObjectId(orderId) }, { $set: { status } });

    revalidatePath('/admin');
    revalidatePath('/admin/success');
    revalidatePath('/admin/failed');
    return { success: true };
}

export async function deleteUser(userId: string): Promise<{success: boolean}> {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
        return { success: false };
    }
    const { ObjectId } = await import('mongodb');
    const db = await connectToDatabase();
    await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    revalidatePath('/admin/accounts');
    return { success: true };
}

const PAGE_SIZE = 5;

export async function getOrdersForAdmin(
  page: number, 
  sort: string, 
  search: string, 
  status: ('Pending UTR' | 'Processing' | 'Completed' | 'Failed')[]
) {
  noStore();
  const db = await connectToDatabase();
  const skip = (page - 1) * PAGE_SIZE;

  let query: any = { status: { $in: status } };
  if (search) {
      query.referralCode = search;
  }

  const ordersFromDb = await db.collection<Order>('orders')
      .find(query)
      .sort({ createdAt: sort === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .toArray();

  const totalOrders = await db.collection('orders').countDocuments(query);
  const hasMore = skip + ordersFromDb.length < totalOrders;

  // Manually serialize the data to convert ObjectId and Date to strings
  const orders = ordersFromDb.map((order: any) => ({
    ...order,
    _id: order._id.toString(),
    createdAt: order.createdAt.toLocaleString(),
  }));

  return { orders, hasMore };
}

export async function getUsersForAdmin(page: number, sort: string, search: string) {
  noStore();
  const db = await connectToDatabase();
  const skip = (page - 1) * PAGE_SIZE;

  let query: any = {};
  if (search) {
    query.referralCode = search;
  }
  
  const usersFromDb = await db.collection<User>('users')
    .find(query)
    .sort({ createdAt: sort === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .toArray();

  const totalUsers = await db.collection('users').countDocuments(query);
  const hasMore = skip + usersFromDb.length < totalUsers;

  // Manually serialize the data
  const users = usersFromDb.map((user: any) => ({
    ...user,
    _id: user._id.toString(),
    createdAt: user.createdAt.toLocaleString(),
  }));


  return { users, hasMore };
}


// --- Wallet & Withdrawal Actions ---

export async function getWalletData(): Promise<{ walletBalance: number; withdrawals: Withdrawal[] }> {
    noStore();
    const session = await getSession();
    if (!session?.username) {
        return { walletBalance: 0, withdrawals: [] };
    }

    const db = await connectToDatabase();
    const user = await db.collection<User>('users').findOne({ username: session.username });
    if (!user) {
        return { walletBalance: 0, withdrawals: [] };
    }
    
    const withdrawalsFromDb = await db.collection<Withdrawal>('withdrawals').find({ userId: user._id.toString() }).sort({ createdAt: -1 }).toArray();

    const withdrawals = withdrawalsFromDb.map((w: any) => ({
        ...w,
        _id: w._id.toString(),
        createdAt: w.createdAt.toLocaleString(),
    }));

    return { walletBalance: user.walletBalance || 0, withdrawals };
}

const upiSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive.'),
  method: z.literal('UPI'),
  upiId: z.string().min(5, 'Invalid UPI ID'),
});

const bankSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive.'),
  method: z.literal('Bank'),
  bankName: z.string().min(3, 'Bank name is required'),
  accountNumber: z.string().min(8, 'Invalid account number'),
  ifscCode: z.string().length(11, 'IFSC code must be 11 characters'),
});

export async function requestWithdrawal(formData: FormData): Promise<FormState> {
    const session = await getSession();
    if (!session?.username) {
        return { success: false, message: 'You must be logged in.' };
    }
    const db = await connectToDatabase();
    const user = await db.collection<User>('users').findOne({ username: session.username });
    if (!user) {
        return { success: false, message: 'User not found.' };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const method = rawFormData.method as 'UPI' | 'Bank';
    
    const schema = method === 'UPI' ? upiSchema : bankSchema;
    const validatedFields = schema.safeParse(rawFormData);

    if (!validatedFields.success) {
        const errors = validatedFields.error.errors.map(e => e.message).join(', ');
        return { success: false, message: `Invalid form data: ${errors}` };
    }

    const { amount } = validatedFields.data;
    
    if (amount > (user.walletBalance || 0)) {
        return { success: false, message: 'Insufficient balance.' };
    }
    
    // Deduct from wallet immediately
    await db.collection('users').updateOne({ _id: user._id }, { $inc: { walletBalance: -amount } });

    const newWithdrawal: Omit<Withdrawal, '_id'> = {
        userId: user._id.toString(),
        username: user.username,
        amount,
        method,
        details: method === 'UPI' ? { upiId: validatedFields.data.upiId } : {
            bankName: validatedFields.data.bankName,
            accountNumber: validatedFields.data.accountNumber,
            ifscCode: validatedFields.data.ifscCode,
        },
        status: 'Pending',
        createdAt: new Date(),
    };

    await db.collection('withdrawals').insertOne(newWithdrawal);
    
    revalidatePath('/account');
    revalidatePath('/admin/withdrawals');
    return { success: true, message: 'Withdrawal request submitted.' };
}

export async function getWithdrawalsForAdmin(page: number, sort: string, status: ('Pending' | 'Completed' | 'Failed')[]) {
    noStore();
    const db = await connectToDatabase();
    const skip = (page - 1) * PAGE_SIZE;

    const query: any = { status: { $in: status } };

    const withdrawalsFromDb = await db.collection<Withdrawal>('withdrawals')
        .find(query)
        .sort({ createdAt: sort === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .toArray();
    
    const totalWithdrawals = await db.collection('withdrawals').countDocuments(query);
    const hasMore = skip + withdrawalsFromDb.length < totalWithdrawals;

    const withdrawals = withdrawalsFromDb.map((w: any) => ({
        ...w,
        _id: w._id.toString(),
        createdAt: w.createdAt.toLocaleString(),
    }));

    return { withdrawals, hasMore };
}

export async function updateWithdrawalStatus(withdrawalId: string, status: 'Completed' | 'Failed'): Promise<{ success: boolean; message?: string }> {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
        return { success: false };
    }
    const { ObjectId } = await import('mongodb');
    const db = await connectToDatabase();

    const result = await db.collection('withdrawals').updateOne(
        { _id: new ObjectId(withdrawalId) },
        { $set: { status } }
    );
    
    if (result.modifiedCount === 0) {
        return { success: false, message: 'Withdrawal request not found or status already updated.' };
    }

    revalidatePath('/admin/withdrawals');
    revalidatePath('/account');
    return { success: true };
}
