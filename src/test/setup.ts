import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock motion/react to avoid animation issues in tests
vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      const Component = ({ children, ...props }: any) => {
        const React = require('react');
        return React.createElement(prop as string, props, children);
      };
      Component.displayName = String(prop);
      return Component;
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useMotionValue: (v: any) => ({ get: () => v, set: vi.fn() }),
}));

// Mock posthog
vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  }),
  PostHogProvider: ({ children }: any) => children,
}));

// Mock posthog utils
vi.mock('@/utils/posthog', () => ({
  safeCapture: vi.fn(),
  safeIdentify: vi.fn(),
}));

// Suppress console.error for cleaner test output (optional)
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOM.render'))
    ) return;
    originalError(...args);
  };
});

afterEach(() => {
  console.error = originalError;
  vi.clearAllMocks();
});
