import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  currency: string;
  language: string;
  logoUrl: string;
  setCurrency: (c: string) => void;
  setLanguage: (l: string) => void;
  setLogoUrl: (url: string) => void;
  formatCurrency: (amount: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState(() => localStorage.getItem('pad_currency') || 'USD');
  const [language, setLanguage] = useState(() => localStorage.getItem('pad_language') || 'es');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('pad_logo_url') || '');

  useEffect(() => {
    localStorage.setItem('pad_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('pad_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('pad_logo_url', logoUrl);
  }, [logoUrl]);

  const formatCurrency = (amount: number) => {
    const symbol = currency === 'USD' ? '$' : 'S/';
    return `${symbol}${amount.toLocaleString(language === 'es' ? 'es-PE' : 'en-US', { minimumFractionDigits: 2 })}`;
  };

  return (
    <SettingsContext.Provider value={{ currency, language, logoUrl, setCurrency, setLanguage, setLogoUrl, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
