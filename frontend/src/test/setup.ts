import '@testing-library/jest-dom/vitest';

// Ensure localStorage is available
const mockStorage: Record<string, string> = {};
if (!global.localStorage || typeof global.localStorage.getItem !== 'function') {
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
      key: (index: number) => Object.keys(mockStorage)[index] || null,
      get length() { return Object.keys(mockStorage).length; }
    },
    writable: true,
    configurable: true
  });
}

import '../i18n';
