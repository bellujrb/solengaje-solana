"use client";

import { useState } from "react";
import { Button } from "../../../components/button";
import Icon from "../../../components/icon";

type CompanyDataFormProps = {
  campaignId?: string;
  onBack: () => void;
  onPay: (companyData: CompanyData) => void;
};

type CompanyData = {
  companyName: string;
  cnpj: string;
  email: string;
  responsibleName: string;
};

export function CompanyDataForm({ onBack, onPay }: CompanyDataFormProps) {
  const [formData, setFormData] = useState<CompanyData>({
    companyName: "Empresa LTDA",
    cnpj: "00.623.904/0001-73",
    email: "email@mail.com",
    responsibleName: "Cristina Lima"
  });

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    onPay(formData);
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
          <h2 className="text-white text-lg font-medium mb-2">Campaign: Summer Beach Collection</h2>
          <p className="text-white text-sm opacity-90">Secure payment via Morph blockchain</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Page Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-black">Dados da Empresa</h1>
            <p className="text-gray-500 text-base text-center">Informações para faturamento e contrato</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Name of the company: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                CNPJ: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email: <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Name of the responsible: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.responsibleName}
                onChange={(e) => handleInputChange('responsibleName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter responsible name"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="px-6 py-6 bg-white border-t border-gray-100">
        <div className="max-w-md mx-auto flex space-x-4">
          <Button
            onClick={onBack}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-4 rounded-lg font-bold text-lg flex items-center justify-center shadow-lg"
          >
            ←
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center shadow-lg"
          >
            Pay
            <Icon name="arrow-right" className="ml-2" size="md" />
          </Button>
        </div>
      </div>
    </div>
  );
} 