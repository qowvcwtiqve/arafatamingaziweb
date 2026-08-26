import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', decimals: 0, prefix: true },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', decimals: 2, prefix: true },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', decimals: 2, prefix: true },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', decimals: 2, prefix: true },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', decimals: 0, prefix: true },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', decimals: 0, prefix: true },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', decimals: 0, prefix: false },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', decimals: 2, prefix: true },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', decimals: 0, prefix: false },
};

const DEFAULT_RATES = {
  INR: 1.0,
  USD: 0.0105,
  EUR: 0.0090,
  GBP: 0.0077,
  BDT: 1.287,
  PKR: 2.91,
  VND: 273.5,
  SGD: 0.0133,
  RUB: 0.881,
};

export const useCurrencyStore = create(
  persist(
    (set, get) => ({
      currency: 'INR',
      rates: DEFAULT_RATES,
      lastFetched: 0,
      loading: false,

      setCurrency: (code) => {
        if (CURRENCIES[code]) {
          set({ currency: code });
        }
      },

      fetchRates: async () => {
        const now = Date.now();
        // Refresh only every 30 minutes
        if (now - get().lastFetched < 30 * 60 * 1000 && Object.keys(get().rates).length >= 9) {
          return;
        }

        try {
          set({ loading: true });
          const { data } = await api.get('/currency/rates');
          if (data && data.rates) {
            set({
              rates: { ...DEFAULT_RATES, ...data.rates },
              lastFetched: now,
              loading: false,
            });
          }
        } catch (err) {
          console.warn('[CurrencyStore] Failed to fetch live rates, keeping current rates:', err.message);
          set({ loading: false });
        }
      },

      convert: (inrAmount) => {
        const val = parseFloat(inrAmount) || 0;
        const curr = get().currency;
        const rate = get().rates[curr] || 1.0;
        return val * rate;
      },

      format: (inrAmount, customCurrency = null) => {
        const val = parseFloat(inrAmount) || 0;
        const currCode = customCurrency || get().currency;
        const currMeta = CURRENCIES[currCode] || CURRENCIES.INR;
        const rate = get().rates[currCode] || (currCode === 'INR' ? 1.0 : (DEFAULT_RATES[currCode] || 1.0));

        const converted = val * rate;
        const decimals = currMeta.decimals;

        let numStr = '';
        if (decimals === 0) {
          numStr = Math.round(converted).toLocaleString('en-US');
        } else {
          numStr = converted.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
        }

        if (currMeta.prefix) {
          return `${currMeta.symbol}${numStr}`;
        }
        return `${numStr} ${currMeta.symbol}`;
      },
    }),
    {
      name: 'quantumxd-currency',
      partialize: (state) => ({ currency: state.currency, rates: state.rates, lastFetched: state.lastFetched }),
    }
  )
);
