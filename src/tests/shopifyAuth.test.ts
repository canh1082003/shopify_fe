import {
  validateAndNormalizeShopDomain,
  resolveBackendApiBaseUrl,
  initiateShopifyOAuth,
  resetOAuthInitiationLock,
  isOAuthInProgress,
} from '../utils/shopifyAuth';

interface TestModule {
  describe: (name: string, fn: () => void | Promise<void>) => void;
  it: (name: string, fn: () => void | Promise<void>) => void;
  beforeEach: (fn: () => void | Promise<void>) => void;
  afterEach: (fn: () => void | Promise<void>) => void;
}

interface AssertModule {
  strictEqual: (actual: unknown, expected: unknown, message?: string) => void;
  notStrictEqual: (actual: unknown, expected: unknown, message?: string) => void;
  ok: (value: unknown, message?: string) => void;
  throws: (fn: () => unknown, expected?: unknown) => void;
}

interface FsModule {
  readFileSync: (filePath: string, encoding: string) => string;
}

interface PathModule {
  resolve: (...paths: string[]) => string;
  dirname: (p: string) => string;
}

interface UrlModule {
  fileURLToPath: (url: string) => string;
}

interface MockWindow {
  top?: unknown;
  location: {
    hostname?: string;
    origin?: string;
    href?: string;
    search?: string;
  };
  open?: (url: string, target: string) => unknown;
  prompt?: (message: string) => string | null;
  shopify?: {
    idToken?: () => Promise<string>;
  };
}

interface CustomProcess {
  env: Record<string, string | undefined>;
}

// Dynamically load Node built-ins to maintain compatibility with browser tsc build (no @types/node)
const testModuleName = 'node:test';
const assertModuleName = 'node:assert';
const fsModuleName = 'node:fs';
const pathModuleName = 'node:path';
const urlModuleName = 'node:url';

const testPkg = (await import(testModuleName)) as unknown as TestModule;
const assertPkg = (await import(assertModuleName)) as unknown as {
  default?: AssertModule;
} & AssertModule;
const fsPkg = (await import(fsModuleName)) as unknown as { default?: FsModule } & FsModule;
const pathPkg = (await import(pathModuleName)) as unknown as { default?: PathModule } & PathModule;
const urlPkg = (await import(urlModuleName)) as unknown as UrlModule;

const { describe, it, beforeEach, afterEach } = testPkg;
const assert = assertPkg.default || assertPkg;
const fs = fsPkg.default || fsPkg;
const path = pathPkg.default || pathPkg;
const fileURLToPath = urlPkg.fileURLToPath;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Shopify Frontend OAuth Integration (Step 2.5 — Final Blocker Fixes)', () => {
  const proc = (globalThis as unknown as { process?: CustomProcess }).process;
  const originalProcessEnv = proc ? { ...proc.env } : {};
  const originalGlobalWindow = (globalThis as unknown as { window?: MockWindow }).window;

  beforeEach(() => {
    resetOAuthInitiationLock();
    if (proc) {
      proc.env = { ...originalProcessEnv };
    }
  });

  afterEach(() => {
    resetOAuthInitiationLock();
    if (proc) {
      proc.env = originalProcessEnv;
    }
    (globalThis as unknown as { window?: MockWindow }).window = originalGlobalWindow;
  });

  describe('1. Mutex Race Condition & Lock Lifecycle (Issue 1)', () => {
    it('acquires lock synchronously BEFORE awaiting idToken() and blocks concurrent invocations', async () => {
      if (proc) proc.env.VITE_API_BASE_URL = 'https://shopify-be-3jd9.onrender.com/api';

      let resolveTokenPromise!: (token: string) => void;
      const delayedTokenPromise = new Promise<string>((resolve) => {
        resolveTokenPromise = resolve;
      });

      let navigationCount = 0;
      const mockTop = {};
      const mockWindow: MockWindow = {
        top: mockTop,
        location: { hostname: 'admin.shopify.com', origin: 'https://admin.shopify.com', href: '' },
        open: () => {
          navigationCount++;
          return null;
        },
        shopify: {
          idToken: () => delayedTokenPromise,
        },
      };
      (globalThis as unknown as { window?: MockWindow }).window = mockWindow;

      assert.strictEqual(isOAuthInProgress(), false);

      // Call 1 begins and awaits delayed idToken
      const call1 = initiateShopifyOAuth(undefined);

      // Assert lock was acquired synchronously before idToken Promise resolved!
      assert.strictEqual(isOAuthInProgress(), true);

      // Call 2 arrives while Call 1 is still awaiting idToken
      const call2 = initiateShopifyOAuth(undefined);

      // Now resolve the delayed token Promise
      const payloadObj = { dest: 'https://delayed-auth-store.myshopify.com' };
      const base64Payload = btoa(JSON.stringify(payloadObj));
      resolveTokenPromise(`header.${base64Payload}.signature`);

      await Promise.all([call1, call2]);

      // Exactly ONE navigation occurred! Call 2 was rejected by synchronous mutex
      assert.strictEqual(navigationCount, 1);
    });

    it('releases lock when target domain resolution fails (cancelled onboarding)', async () => {
      if (proc) proc.env.VITE_API_BASE_URL = 'https://api.stockpilot.io/api';

      const mockWindow: MockWindow = {
        location: { hostname: 'localhost', origin: 'http://localhost:5173', href: '' },
        prompt: () => null, // User cancelled
      };
      mockWindow.top = mockWindow;
      (globalThis as unknown as { window?: MockWindow }).window = mockWindow;

      await initiateShopifyOAuth(null);

      // Lock must be released
      assert.strictEqual(isOAuthInProgress(), false);
    });

    it('releases lock when domain validation fails or throws', async () => {
      if (proc) proc.env.VITE_API_BASE_URL = 'https://api.stockpilot.io/api';

      const mockWindow: MockWindow = {
        location: { hostname: 'localhost', origin: 'http://localhost:5173', href: '' },
      };
      (globalThis as unknown as { window?: MockWindow }).window = mockWindow;

      await initiateShopifyOAuth('invalid_store_with_underscore.myshopify.com');

      // Lock must be released
      assert.strictEqual(isOAuthInProgress(), false);
    });

    it('releases lock when browser navigation throws an exception', async () => {
      if (proc) proc.env.VITE_API_BASE_URL = 'https://shopify-be-3jd9.onrender.com/api';

      const mockTop = {};
      const mockWindow: MockWindow = {
        top: mockTop,
        location: { hostname: 'admin.shopify.com', origin: 'https://admin.shopify.com', href: '' },
        open: () => {
          throw new Error('Top-level navigation blocked by sandbox security policy');
        },
      };
      (globalThis as unknown as { window?: MockWindow }).window = mockWindow;

      await initiateShopifyOAuth('nav-fail-store.myshopify.com');

      // Lock must be released immediately so merchant can retry
      assert.strictEqual(isOAuthInProgress(), false);
    });
  });

  describe('2. First-Time Installation & Embedded App Bridge Behavior (Issues 2 & 3)', () => {
    it('initiates OAuth for first-time merchant with NO existing Shop or Session using App Bridge ID token routing hint', async () => {
      if (proc) proc.env.VITE_API_BASE_URL = 'https://shopify-be-3jd9.onrender.com/api';

      const payloadObj = { dest: 'https://first-time-store.myshopify.com' };
      const base64Payload = btoa(JSON.stringify(payloadObj));
      const fakeAppBridgeToken = `header.${base64Payload}.signature`;

      let navigatedUrl = '';
      let windowTarget = '';

      const mockTop = {};
      const mockWindow: MockWindow = {
        top: mockTop,
        location: { hostname: 'admin.shopify.com', origin: 'https://admin.shopify.com', href: '' },
        open: (url: string, target: string) => {
          navigatedUrl = url;
          windowTarget = target;
          return null;
        },
        shopify: {
          idToken: async () => fakeAppBridgeToken,
        },
      };
      (globalThis as unknown as { window?: MockWindow }).window = mockWindow;

      await initiateShopifyOAuth(undefined);

      assert.strictEqual(windowTarget, '_top');
      assert.strictEqual(
        navigatedUrl,
        'https://shopify-be-3jd9.onrender.com/api/integrations/shopify/auth?shop=first-time-store.myshopify.com&redirect=true'
      );
    });

    it('falls back to URL query parameter (?shop=...) in embedded mode when App Bridge token fails', async () => {
      if (proc) proc.env.VITE_API_BASE_URL = 'https://shopify-be-3jd9.onrender.com/api';

      let navigatedUrl = '';
      const mockTop = {};
      const mockWindow: MockWindow = {
        top: mockTop,
        location: {
          hostname: 'admin.shopify.com',
          origin: 'https://admin.shopify.com',
          href: '',
          search: '?shop=param-store.myshopify.com&host=abcd',
        },
        open: (url: string) => {
          navigatedUrl = url;
          return null;
        },
        shopify: {
          idToken: async () => {
            throw new Error('App Bridge temporarily unavailable');
          },
        },
      };
      (globalThis as unknown as { window?: MockWindow }).window = mockWindow;

      await initiateShopifyOAuth(undefined);

      assert.strictEqual(
        navigatedUrl,
        'https://shopify-be-3jd9.onrender.com/api/integrations/shopify/auth?shop=param-store.myshopify.com&redirect=true'
      );
    });

    it('does NOT prompt for shop domain inside an embedded iframe when App Bridge and query params are missing (Issue 4)', async () => {
      let promptWasCalled = false;
      let navigationTriggered = false;

      const mockTop = {};
      const mockWindow: MockWindow = {
        top: mockTop, // Embedded iframe (top !== window)
        location: {
          hostname: 'admin.shopify.com',
          origin: 'https://admin.shopify.com',
          href: '',
          search: '',
        },
        prompt: () => {
          promptWasCalled = true;
          return 'attacker.myshopify.com';
        },
        open: () => {
          navigationTriggered = true;
          return null;
        },
      };
      (globalThis as unknown as { window?: MockWindow }).window = mockWindow;

      await initiateShopifyOAuth(undefined);

      // Prompt MUST NOT be called inside an embedded iframe
      assert.strictEqual(promptWasCalled, false);
      assert.strictEqual(navigationTriggered, false);
      assert.strictEqual(isOAuthInProgress(), false);
    });
  });

  describe('3. Backend URL Hardening & Route Enforcement (Issue 4)', () => {
    it('rejects Backend URLs containing credentials (username/password)', () => {
      assert.throws(
        () => resolveBackendApiBaseUrl('https://admin:secret123@api.stockpilot.io/api'),
        (err: unknown) =>
          err instanceof Error && err.message.includes('không được chứa thông tin xác thực')
      );
    });

    it('rejects Backend URLs containing query strings or fragments', () => {
      assert.throws(
        () => resolveBackendApiBaseUrl('https://api.stockpilot.io/api?env=prod'),
        (err: unknown) =>
          err instanceof Error && err.message.includes('không được chứa query string')
      );

      assert.throws(
        () => resolveBackendApiBaseUrl('https://api.stockpilot.io/api#section'),
        (err: unknown) =>
          err instanceof Error && err.message.includes('không được chứa URL fragment')
      );
    });

    it('rejects relative URLs containing query, fragment, or credentials', () => {
      (globalThis as unknown as { window?: MockWindow }).window = {
        location: { hostname: 'localhost', origin: 'http://localhost:5173', href: '' },
      };

      assert.throws(
        () => resolveBackendApiBaseUrl('/api?foo=bar'),
        (err: unknown) =>
          err instanceof Error &&
          err.message.includes('không được chứa query, fragment hoặc credentials')
      );
    });

    it('preserves valid configurations for different ports and /api prefix', () => {
      (globalThis as unknown as { window?: MockWindow }).window = {
        location: { hostname: 'localhost', origin: 'http://localhost:5173', href: '' },
      };

      // Port 5000 with /api
      assert.strictEqual(
        resolveBackendApiBaseUrl('http://localhost:5000/api'),
        'http://localhost:5000/api'
      );

      // Port 5000 without /api (appends /api)
      assert.strictEqual(
        resolveBackendApiBaseUrl('http://localhost:5000'),
        'http://localhost:5000/api'
      );

      // Production HTTPS URL
      assert.strictEqual(
        resolveBackendApiBaseUrl('https://shopify-be-3jd9.onrender.com/api'),
        'https://shopify-be-3jd9.onrender.com/api'
      );
    });

    it('strictly enforces HTTPS for non-localhost Backend URLs', () => {
      assert.throws(
        () => resolveBackendApiBaseUrl('http://insecure-backend.remote.com/api'),
        (err: unknown) =>
          err instanceof Error && err.message.includes('bắt buộc phải sử dụng HTTPS')
      );
    });
  });

  describe('4. Strict Shopify Domain Validation (RFC / Backend Alignment)', () => {
    it('normalizes valid Shopify domains to lowercase', () => {
      assert.strictEqual(
        validateAndNormalizeShopDomain('  Store-Alpha-1.myshopify.com  '),
        'store-alpha-1.myshopify.com'
      );
    });

    it('rejects underscores in shop domain', () => {
      assert.throws(
        () => validateAndNormalizeShopDomain('store_bad.myshopify.com'),
        (err: unknown) => err instanceof Error && err.message.includes('ký tự cấm')
      );
    });

    it('rejects leading and trailing hyphens in shop domain', () => {
      assert.throws(
        () => validateAndNormalizeShopDomain('-store.myshopify.com'),
        (err: unknown) =>
          err instanceof Error && err.message.includes('Định dạng miền cửa hàng không hợp lệ')
      );

      assert.throws(
        () => validateAndNormalizeShopDomain('store-.myshopify.com'),
        (err: unknown) =>
          err instanceof Error && err.message.includes('Định dạng miền cửa hàng không hợp lệ')
      );
    });

    it('rejects empty shop labels (myshopify.com and .myshopify.com)', () => {
      assert.throws(
        () => validateAndNormalizeShopDomain('myshopify.com'),
        (err: unknown) =>
          err instanceof Error && err.message.includes('Định dạng miền cửa hàng không hợp lệ')
      );

      assert.throws(
        () => validateAndNormalizeShopDomain('.myshopify.com'),
        (err: unknown) =>
          err instanceof Error && err.message.includes('Định dạng miền cửa hàng không hợp lệ')
      );
    });

    it('rejects URL schemes, ports, paths, query strings, and fragments', () => {
      assert.throws(
        () => validateAndNormalizeShopDomain('https://store.myshopify.com'),
        (err: unknown) => err instanceof Error && err.message.includes('giao thức')
      );

      assert.throws(
        () => validateAndNormalizeShopDomain('store.myshopify.com:8080'),
        (err: unknown) => err instanceof Error && err.message.includes('cổng')
      );

      assert.throws(
        () => validateAndNormalizeShopDomain('store.myshopify.com/admin/oauth'),
        (err: unknown) => err instanceof Error && err.message.includes('đường dẫn')
      );
    });
  });

  describe('5. Source Code Security Audit', () => {
    it('SettingsPage.tsx has zero hardcoded fallback domains, secrets, or _blank popups', () => {
      const filePath = path.resolve(__dirname, '../features/settings/SettingsPage.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.strictEqual(content.includes('conganh-test-lab.myshopify.com'), false);
      assert.strictEqual(content.includes('ff20213b7fd3fb4fc9ebd655aed73abd'), false);
      assert.strictEqual(content.includes("'_blank'"), false);
      assert.ok(content.includes('initiateShopifyOAuth'));
    });

    it('TopBar.tsx has zero hardcoded fallback domains, secrets, or _blank popups', () => {
      const filePath = path.resolve(__dirname, '../components/TopBar.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.strictEqual(content.includes('conganh-test-lab.myshopify.com'), false);
      assert.strictEqual(content.includes('ff20213b7fd3fb4fc9ebd655aed73abd'), false);
      assert.strictEqual(content.includes("'_blank'"), false);
      assert.ok(content.includes('initiateShopifyOAuth'));
    });
  });
});
