/**
 * Real-Time Currency Exchange Rate Service
 * Supports: INR, USD, EUR, GBP, BDT, PKR, VND, SGD, RUB
 * Base currency: INR
 */

const SUPPORTED_CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', decimals: 0 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', decimals: 2 },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', decimals: 0 },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', decimals: 0 },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', decimals: 0 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', decimals: 2 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', flag: '🇷🇺', decimals: 0 },
};

// Fallback rates if external APIs fail temporarily
const FALLBACK_RATES = {
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

let cachedRates = { ...FALLBACK_RATES };
let lastFetchedAt = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function fetchLiveExchangeRates() {
  const now = Date.now();
  if (now - lastFetchedAt < CACHE_TTL_MS && Object.keys(cachedRates).length >= 9) {
    return {
      base: 'INR',
      rates: cachedRates,
      currencies: SUPPORTED_CURRENCIES,
      updated_at: new Date(lastFetchedAt).toISOString(),
    };
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR', { timeout: 6000 });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const newRates = { INR: 1.0 };
        for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
          if (data.rates[code]) {
            newRates[code] = parseFloat(data.rates[code]);
          } else if (cachedRates[code]) {
            newRates[code] = cachedRates[code];
          }
        }
        cachedRates = newRates;
        lastFetchedAt = now;
        console.log('[CurrencyService] Successfully updated real-time exchange rates from open.er-api.com');
      }
    }
  } catch (err) {
    console.warn('[CurrencyService] Primary rate API failed, attempting secondary...', err.message);
    try {
      const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/INR', { timeout: 6000 });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.rates) {
          const newRates = { INR: 1.0 };
          for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
            if (data2.rates[code]) {
              newRates[code] = parseFloat(data2.rates[code]);
            }
          }
          cachedRates = newRates;
          lastFetchedAt = now;
          console.log('[CurrencyService] Updated rates from secondary API');
        }
      }
    } catch (err2) {
      console.error('[CurrencyService] All rate APIs failed, using cached/fallback rates:', err2.message);
    }
  }

  return {
    base: 'INR',
    rates: cachedRates,
    currencies: SUPPORTED_CURRENCIES,
    updated_at: new Date(lastFetchedAt || Date.now()).toISOString(),
  };
}

export { SUPPORTED_CURRENCIES };
