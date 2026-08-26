import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', decimals: 0, prefix: true, minDeposit: 10 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', decimals: 2, prefix: true, minDeposit: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', decimals: 2, prefix: true, minDeposit: 1 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', decimals: 2, prefix: true, minDeposit: 1 },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', decimals: 0, prefix: true, minDeposit: 20 },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', decimals: 0, prefix: true, minDeposit: 50 },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', decimals: 0, prefix: false, minDeposit: 10000 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', decimals: 2, prefix: true, minDeposit: 1 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', decimals: 0, prefix: false, minDeposit: 50 },
};

export const CURRENCY_PRESETS = {
  INR: [100, 250, 500, 1000, 2000],
  USD: [5, 10, 25, 50, 100],
  EUR: [5, 10, 25, 50, 100],
  GBP: [5, 10, 20, 50, 100],
  BDT: [200, 500, 1000, 2500, 5000],
  PKR: [500, 1000, 2500, 5000, 10000],
  VND: [100000, 250000, 500000, 1000000, 2000000],
  SGD: [10, 25, 50, 100, 200],
  RUB: [500, 1000, 2500, 5000, 10000],
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

      toINR: (currencyAmount, currCode = null) => {
        const val = parseFloat(currencyAmount) || 0;
        const curr = currCode || get().currency;
        const rate = get().rates[curr] || (curr === 'INR' ? 1.0 : (DEFAULT_RATES[curr] || 1.0));
        if (rate <= 0) return val;
        return val / rate;
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

/**
 * Custom React hook ensuring instant reactive re-rendering on any currency change
 */
export function useCurrency() {
  const currency = useCurrencyStore((s) => s.currency);
  const rates = useCurrencyStore((s) => s.rates);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const fetchRates = useCurrencyStore((s) => s.fetchRates);

  const current = CURRENCIES[currency] || CURRENCIES.INR;
  const presets = CURRENCY_PRESETS[currency] || CURRENCY_PRESETS.INR;
  const currentRate = rates[currency] || (currency === 'INR' ? 1.0 : (DEFAULT_RATES[currency] || 1.0));

  const format = (inrAmount, customCurrency = null) => {
    const val = parseFloat(inrAmount) || 0;
    const currCode = customCurrency || currency;
    const currMeta = CURRENCIES[currCode] || CURRENCIES.INR;
    const rate = rates[currCode] || (currCode === 'INR' ? 1.0 : (DEFAULT_RATES[currCode] || 1.0));

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
  };

  const formatDirect = (amountInSelectedCurrency, customCurrency = null) => {
    const val = parseFloat(amountInSelectedCurrency) || 0;
    const currCode = customCurrency || currency;
    const currMeta = CURRENCIES[currCode] || CURRENCIES.INR;
    const decimals = currMeta.decimals;

    let numStr = '';
    if (decimals === 0) {
      numStr = Math.round(val).toLocaleString('en-US');
    } else {
      numStr = val.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }

    if (currMeta.prefix) {
      return `${currMeta.symbol}${numStr}`;
    }
    return `${numStr} ${currMeta.symbol}`;
  };

  const convert = (inrAmount) => {
    const val = parseFloat(inrAmount) || 0;
    return val * currentRate;
  };

  const toINR = (amountInSelectedCurrency) => {
    const val = parseFloat(amountInSelectedCurrency) || 0;
    if (currentRate <= 0) return val;
    return val / currentRate;
  };

  return {
    currency,
    rates,
    setCurrency,
    fetchRates,
    format,
    formatDirect,
    convert,
    toINR,
    current,
    presets,
    currentRate,
  };
}
