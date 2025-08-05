import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Handle referral codes
  const referralCode = request.nextUrl.searchParams.get('ref');
  const existingReferralCode = request.cookies.get('referral_code')?.value;

  // Only set the referral code if it's not already set
  // This ensures the first referrer gets credit
  if (referralCode && !existingReferralCode) {
    response.cookies.set('referral_code', referralCode, {
      maxAge: 365 * 24 * 60 * 60, // 1 year, to persist across sessions
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
