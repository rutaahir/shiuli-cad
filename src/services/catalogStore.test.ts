import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api';
import {
  fetchCatalog,
  retryCatalog,
  getSnapshot,
  subscribe,
  BackendCategory,
  BackendProduct,
  BackendStyle,
  FALLBACK_CATEGORIES,
} from './catalogStore';

// Preserve original methods
const originalGetCategories = api.getCategories.bind(api);
const originalGetDesignStyles = api.getDesignStyles.bind(api);
const originalGetProducts = api.getProducts.bind(api);

const mockCategories: BackendCategory[] = [
  {
    id: 101,
    name: 'Diamond Rings',
    slug: 'diamond-rings',
    parent: null,
    parent_name: null,
    display_order: 1,
    product_count: 1,
    subcategories: [
      {
        id: 102,
        name: 'Solitaires',
        slug: 'solitaires',
        parent: 101,
        parent_name: 'Diamond Rings',
        display_order: 1,
        product_count: 1,
        subcategories: [],
      },
    ],
  },
];

const mockStyles: BackendStyle[] = [
  { id: 201, name: 'Art Deco' },
];

const mockProducts: BackendProduct[] = [
  {
    id: 301,
    title: 'Solitaire Engagement Ring 1.0ct',
    slug: 'solitaire-engagement-ring-1ct',
    category: 102,
    category_name: 'Solitaires',
    price: '45000',
    description: 'Watertight Rhino 3DM native CAD file',
    is_bestseller: true,
    is_new: true,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
];

describe('catalogStore', () => {
  afterEach(() => {
    // Restore originals
    api.getCategories = originalGetCategories;
    api.getDesignStyles = originalGetDesignStyles;
    api.getProducts = originalGetProducts;
  });

  test('1. Success state: all endpoints resolve, no errors and no fallback dummy data', async () => {
    api.getCategories = async () => mockCategories as any;
    api.getDesignStyles = async () => mockStyles as any;
    api.getProducts = async () => ({ results: mockProducts } as any);

    await fetchCatalog(true);

    const snapshot = getSnapshot();
    assert.equal(snapshot.isLoading, false, 'isLoading must be false on completion');
    assert.equal(snapshot.isError, false, 'isError must be false on success');
    assert.equal(snapshot.errorMessage, null, 'errorMessage must be null on success');
    assert.equal(snapshot.errorDetails, null, 'errorDetails must be null on success');
    assert.equal(snapshot.categories.length, 1);
    assert.equal(snapshot.categories[0].name, 'Diamond Rings');
    assert.equal(snapshot.allCategories.length, 2); // 1 parent + 1 sub
    assert.equal(snapshot.products.length, 1);
    assert.equal(snapshot.products[0].category_slug, 'solitaires');
    assert.equal(snapshot.products[0].parent_slug, 'diamond-rings');
    assert.equal(snapshot.styles.length, 1);
  });

  test('2. Total failure: all endpoints reject, isError=true, informative error, no dummy data', async () => {
    // Simulate backend down
    api.getCategories = async () => {
      const err = new Error('Failed to fetch (ECONNREFUSED)');
      (err as any).status = 503;
      throw err;
    };
    api.getDesignStyles = async () => {
      const err = new Error('Service Unavailable');
      (err as any).status = 503;
      throw err;
    };
    api.getProducts = async () => {
      const err = new Error('Gateway Timeout');
      (err as any).status = 504;
      throw err;
    };

    // Force fetch to clear previous state
    // We can observe the error behavior
    await fetchCatalog(true);

    const snapshot = getSnapshot();
    assert.equal(snapshot.isLoading, false, 'isLoading must be reset in finally block');
    assert.equal(snapshot.isError, true, 'isError must be true when all calls fail');
    assert.notEqual(snapshot.errorMessage, null, 'errorMessage must be set');
    assert.match(snapshot.errorMessage!, /Categories:/);
    assert.match(snapshot.errorMessage!, /Products:/);
    assert.match(snapshot.errorMessage!, /Styles:/);
    assert.notEqual(snapshot.errorDetails, null);
    assert.match(snapshot.errorDetails!.categories!, /503/);
    assert.match(snapshot.errorDetails!.products!, /504/);

    // CRITICAL: Must not fall back to FALLBACK_CATEGORIES as if they were real data
    assert.notDeepEqual(snapshot.categories, FALLBACK_CATEGORIES, 'Must NOT inject FALLBACK_CATEGORIES on failure');
  });

  test('3. Partial failure: products fail (HTTP 500) but categories succeed', async () => {
    api.getCategories = async () => mockCategories as any;
    api.getDesignStyles = async () => mockStyles as any;
    api.getProducts = async () => {
      const err = new Error('Internal Server Error in catalog view');
      (err as any).status = 500;
      throw err;
    };

    await fetchCatalog(true);

    const snapshot = getSnapshot();
    assert.equal(snapshot.isLoading, false, 'isLoading must be false');
    assert.equal(snapshot.isError, true, 'isError must be true when a required endpoint fails');
    assert.notEqual(snapshot.errorMessage, null);
    assert.match(snapshot.errorMessage!, /Products: HTTP 500/);
    // Categories succeeded, so it should not be listed as failed
    assert.equal(snapshot.errorMessage!.includes('Categories:'), false);
    // Categories should have updated despite product failure
    assert.equal(snapshot.categories.length, 1);
    assert.equal(snapshot.categories[0].slug, 'diamond-rings');
  });

  test('4. Stale data retention: preserves existing data if subsequent fetch fails', async () => {
    // First: successful fetch
    api.getCategories = async () => mockCategories as any;
    api.getDesignStyles = async () => mockStyles as any;
    api.getProducts = async () => ({ results: mockProducts } as any);
    await fetchCatalog(true);

    const initialSnapshot = getSnapshot();
    assert.equal(initialSnapshot.products.length, 1);
    assert.equal(initialSnapshot.isError, false);

    // Second: backend goes down
    api.getCategories = async () => { throw new Error('Network offline'); };
    api.getDesignStyles = async () => { throw new Error('Network offline'); };
    api.getProducts = async () => { throw new Error('Network offline'); };

    await fetchCatalog(true);

    const staleSnapshot = getSnapshot();
    assert.equal(staleSnapshot.isLoading, false);
    assert.equal(staleSnapshot.isError, true, 'isError must be true to indicate offline/stale state');
    assert.notEqual(staleSnapshot.errorMessage, null);
    // Stale products and categories must be preserved so user does not see empty screen
    assert.equal(staleSnapshot.products.length, 1, 'Stale products must be retained');
    assert.equal(staleSnapshot.categories.length, 1, 'Stale categories must be retained');
  });

  test('5. Recovery via retryCatalog: recovers from error to healthy state', async () => {
    // Start with failing backend
    api.getCategories = async () => { throw new Error('Connection refused'); };
    api.getDesignStyles = async () => { throw new Error('Connection refused'); };
    api.getProducts = async () => { throw new Error('Connection refused'); };

    await fetchCatalog(true);
    assert.equal(getSnapshot().isError, true);

    // Backend recovers
    api.getCategories = async () => mockCategories as any;
    api.getDesignStyles = async () => mockStyles as any;
    api.getProducts = async () => ({ results: mockProducts } as any);

    // Call retryCatalog()
    await retryCatalog();

    const recovered = getSnapshot();
    assert.equal(recovered.isLoading, false);
    assert.equal(recovered.isError, false, 'isError must reset to false on recovery');
    assert.equal(recovered.errorMessage, null, 'errorMessage must be cleared on recovery');
    assert.equal(recovered.errorDetails, null);
    assert.equal(recovered.products.length, 1);
    assert.equal(recovered.categories.length, 1);
  });

  test('6. Subscriber notification: subscribers are notified on loading and completion', async () => {
    api.getCategories = async () => mockCategories as any;
    api.getDesignStyles = async () => mockStyles as any;
    api.getProducts = async () => ({ results: mockProducts } as any);

    const states: boolean[] = [];
    const unsubscribe = subscribe((s) => {
      states.push(s.isLoading);
    });

    await retryCatalog();
    unsubscribe();

    // Must have observed states
    assert.ok(states.length >= 2, 'Subscribers must be notified across lifecycle');
    assert.equal(states[states.length - 1], false, 'Final state must have isLoading=false');
  });
});
