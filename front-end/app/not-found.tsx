'use client';

import Link from 'next/link';

// Force dynamic rendering to avoid SSR issues with Privy
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-gray-600 mb-8">Page not found</p>
      <Link href="/" className="text-blue-500 hover:underline">
        Return to home
      </Link>
    </div>
  );
}

