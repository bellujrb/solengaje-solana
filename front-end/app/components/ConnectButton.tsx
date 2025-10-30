"use client";

import React, { useState, useEffect } from 'react';
import { UserPill } from '@privy-io/react-auth/ui';

export const ConnectButton = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
    );
  }

  return (
    <UserPill
      action={{
        type: 'login',
        options: {
          loginMethods: ['email', 'wallet'],
          walletChainType: 'solana-only',
        },
      }}
    />
  );
};

