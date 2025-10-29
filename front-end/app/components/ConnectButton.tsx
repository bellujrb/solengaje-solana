"use client";

import React from 'react';
import { UserPill } from '@privy-io/react-auth/ui';

export const ConnectButton = () => {
  return (
    <UserPill 
      action={{ 
        type: 'login', 
        options: { 
          loginMethods: ['email', 'wallet'],
          walletChainType: 'solana-only',
        } 
      }}
    />
  );
};

