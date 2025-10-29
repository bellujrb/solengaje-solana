"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "../../../components/button";
import Icon from "../../../components/icon";
import QRCode from "qrcode";

type PixPaymentScreenProps = {
  campaignId?: string;
  onBack: () => void;
  onConfirmPayment: () => void;
  amount?: string;
  campaignName?: string;
  companyData?: {
    companyName: string;
    cnpj: string;
  };
};

export function PixPaymentScreen({ 
  onBack, 
  onConfirmPayment, 
  amount = "$5.000",
  campaignName = "Summer Beach Collection",
  companyData = {
    companyName: "Empresa LTDA",
    cnpj: "00.623.904/0001-73"
  }
}: PixPaymentScreenProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const pixCode = "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5913Empresa LTDA6008Sao Paulo62070503***6304E2CA";

  // Generate QR Code on component mount
  useState(() => {
    QRCode.toDataURL(pixCode, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }).then((url: string) => {
      setQrCodeUrl(url);
    }).catch((err: Error) => {
      console.error("Error generating QR code:", err);
    });
  });

  const handleCopyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy PIX code:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] bg-[var(--app-background)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Icon name="lightning" className="text-white mr-2" size="md" />
            <span className="text-white font-bold text-xl">Solengaje</span>
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-white text-lg font-medium mb-2">Campaign: {campaignName}</h2>
          <p className="text-white text-sm opacity-90">Secure payment via Morph blockchain</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Page Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-black">Pagamento PIX</h1>
            <p className="text-gray-500 text-base">Escaneie o QR Code ou copie o código PIX</p>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-green-200">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-green-600">{amount}</div>
              <div className="text-gray-600 text-sm">
                <div>Campanha: {campaignName}</div>
                <div>{companyData.companyName} • {companyData.cnpj}</div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="text-center space-y-4">
              {qrCodeUrl ? (
                <div className="flex justify-center">
                  <Image 
                    src={qrCodeUrl} 
                    alt="PIX QR Code" 
                    width={192}
                    height={192}
                    className="w-48 h-48 rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-200 mx-auto rounded-lg flex items-center justify-center">
                  <div className="text-gray-500 text-sm">Loading QR Code...</div>
                </div>
              )}
              <p className="text-gray-600 text-sm">Scan your QR Code</p>
            </div>
          </div>

          {/* PIX Code Section */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Or copy your PIX Code:</p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-xs text-gray-700 font-mono break-all">
                  {pixCode}
                </p>
              </div>
              <Button
                onClick={handleCopyPixCode}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center"
              >
                <Icon name="check" className="mr-2" size="sm" />
                {copied ? "Copied!" : "Copy your PIX Code"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="px-6 py-6 bg-white border-t border-gray-100">
        <div className="max-w-md mx-auto space-y-4">
          <Button
            onClick={onConfirmPayment}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg font-bold text-lg"
          >
            Confirm payment and continue
          </Button>
          <Button
            onClick={onBack}
            className="w-full bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-medium flex items-center justify-center"
          >
            ← Back
          </Button>
        </div>
      </div>
    </div>
  );
} 