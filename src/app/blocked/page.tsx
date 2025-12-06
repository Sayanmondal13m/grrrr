
'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldBan } from 'lucide-react';

export default function BlockedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
            <ShieldBan className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-headline text-destructive">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-foreground">
            {reason || 'Your access to this service has been restricted.'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            If you believe this is a mistake, please try again later or contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
