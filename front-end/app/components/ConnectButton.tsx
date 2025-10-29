// Componente mockado para substituir ConnectButton do RainbowKit
import React from 'react';

export const ConnectButton = () => {
  const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
      <div className="w-2 h-2 bg-green-400 rounded-full" />
      <span className="font-medium">{shortAddress}</span>
    </div>
  );
};

