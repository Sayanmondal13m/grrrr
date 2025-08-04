import { type ObjectId } from 'mongodb';

export interface User {
  _id: ObjectId;
  username: string;
  password:  string;
  referralCode?: string;
  referredBy?: string;
  walletBalance?: number;
  createdAt: Date;
}

export interface Product {
    _id: string; // From MongoDB
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
    dataAiHint: string;
    isAvailable: boolean;
    isVanished: boolean;
}

export interface Order {
    _id: ObjectId;
    userId: string; // The unique ID assigned to the user/browser session
    gamingId: string;
    productId: string;
    productName: string;
    productPrice: number;
    productImageUrl: string;
    paymentMethod: 'UPI' | 'Redeem Code';
    status: 'Processing' | 'Completed' | 'Failed';
    utr?: string;
    redeemCode?: string;
    referralCode?: string;
    createdAt: Date;
}

export interface Withdrawal {
  _id: ObjectId;
  userId: string;
  username: string;
  referralCode?: string;
  amount: number;
  method: 'Bank' | 'UPI';
  details: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  };
  status: 'Pending' | 'Completed' | 'Failed';
  createdAt: Date;
}
