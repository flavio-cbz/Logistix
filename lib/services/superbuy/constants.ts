<<<<<<< HEAD
/**
 * Constants for Superbuy integration
 * Extracted from multiple files to avoid magic numbers
 */

export const SUPERBUY_URLS = {
  LOGIN: 'https://www.superbuy.com/en/page/login/',
  CHECK_LOGIN: 'https://www.superbuy.com/ajax/check-login',
  PACKAGE_LIST: 'https://front.superbuy.com/package/package/list',
} as const;

export const SUPERBUY_SELECTORS = {
  LOGIN: {
    EMAIL_INPUT: ['input[type="text"]', 'input[type="email"]', 'input[name="email"]', '#email'],
    PASSWORD_INPUT: ['input[type="password"]', 'input[name="password"]', '#password'],
    SUBMIT_BUTTON: [
      'button[type="submit"]',
      '.login-btn',
      '.submit-btn',
      'button:has-text("Sign In")',
      'input[type="submit"]'
    ],
    ERROR_BOX: '.error-box',
    SUCCESS_INDICATORS: ['[data-user]', '.user-menu', '.account-menu'],
  },
  CAPTCHA: {
    IFRAME: ['iframe[src*="turing.captcha"]', 'iframe[src*="tcaptcha"]'],
    CANVAS: ['canvas', '.tc-bg canvas', '.tc-opera canvas'],
    SLIDER_BUTTON: ['.tc-slider-normal', '.tc-slider-ie', '.tcaptcha-drag-el'],
    TRACK: ['#tcOperation', '.tcaptcha-drag-wrap', '.tc-drag', '.tc-opera'],
    REFRESH: ['.tc-action--refresh', '.tc-action.tc-icon'],
    CONTAINER: ['#tcOperation', '.tc-captcha', '#tcWrap', '.tc-drag', '.tc-opera'],
    SUCCESS: ['.tc-success', '.tc-success-icon', '.tc-success-text', '.tc-cover.tc-success'],
    CONTINUE_BUTTON: ['button:has-text("Continue")', 'button:has-text("Next")', '.tc-btn-next'],
  },
  PARCELS: {
    LIST_ITEMS: '.parcel-item, tr.parcel-row, .package-list-item, .package-item',
    ID: '.parcel-no, .package-no',
    TRACKING: '.tracking-no, .logistics-no, .express-no',
    WEIGHT: '.weight',
    STATUS: '.status, .package-status',
    CARRIER: '.carrier, .logistics-company, .delivery-company',
  },
  ORDERS: {
    LIST_ITEMS: '.order-list-item, tr.order-row',
    ID: '.order-info .code, .order-no',
    STATUS: '.status, .order-status',
    PRICE: '.price, .total-price',
    PRODUCT_ITEM: '.product-item',
    PRODUCT_TITLE: '.title',
    PRODUCT_QTY: '.qty',
  }
} as const;

export const BROWSER_CONFIG = {
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  VIEWPORT: { width: 1280, height: 800 },
  CAPTCHA_LOAD_DELAY: 3000,
  LOGIN_TIMEOUT: 60000,
} as const;

// Status codes used by Superbuy API/Frontend
// Based on reverse engineering of parcels/route.ts
export enum SuperbuyPackageStatus {
    // 2 seems to be the default/pending status
    PENDING = 2,

    // 57 seems to correspond to 'Shipped'
    SHIPPED = 57,

    // 100 seems to correspond to 'Received'
    RECEIVED = 100,
}

// Internal LogistiX Status mapping
// Used when exact Superbuy status is unknown
export const LOGISTIX_STATUS = {
    PENDING: 'En attente',
    UNKNOWN: 'Unknown',
} as const;

// API Error codes
export const SUPERBUY_API_CODES = {
    SESSION_EXPIRED: 10008,
    SUCCESS: 0,
} as const;

// Timeouts in milliseconds
export const SUPERBUY_TIMEOUTS = {
    NAVIGATION: 60000,
    ELEMENT_WAIT_LONG: 15000,
    ELEMENT_WAIT_SHORT: 10000,
    WARMUP: 45000,
    REFRESH_DELAY: 100,
} as const;

// Pagination defaults
export const SUPERBUY_PAGINATION = {
    DEFAULT_PAGE_SIZE: 100,
} as const;

// Status Mapping Patterns (lowercase)
export const SUPERBUY_STATUS_PATTERNS = {
    PENDING: ['payment pending', 'payment verification', 'review pending', 'verified', 'waiting packing'],
    IN_TRANSIT: ['packing', 'packaging completed', 'shipped'],
    DELIVERED: ['received'],
    RETURNED: ['returned', 'returned by chinese customs', 'returned by customs'],
    CANCELLED: ['cancelled', 'void'],
    LOST: ['lost'],
} as const;
=======
/**
 * Constants for Superbuy integration
 * Extracted from multiple files to avoid magic numbers
 */

// Status codes used by Superbuy API/Frontend
// Based on reverse engineering of parcels/route.ts
export enum SuperbuyPackageStatus {
    // 2 seems to be the default/pending status
    PENDING = 2,

    // 57 seems to correspond to 'Shipped'
    SHIPPED = 57,

    // 100 seems to correspond to 'Received'
    RECEIVED = 100,
}

// Internal LogistiX Status mapping
// Used when exact Superbuy status is unknown
export const LOGISTIX_STATUS = {
    PENDING: 'En attente',
    UNKNOWN: 'Unknown',
} as const;

// API Error codes
export const SUPERBUY_API_CODES = {
    SESSION_EXPIRED: 10008,
    SUCCESS: 0,
} as const;

// Timeouts in milliseconds
export const SUPERBUY_TIMEOUTS = {
    NAVIGATION: 60000,
    ELEMENT_WAIT_LONG: 15000,
    ELEMENT_WAIT_SHORT: 10000,
    WARMUP: 45000,
    REFRESH_DELAY: 100,
} as const;

// Pagination defaults
export const SUPERBUY_PAGINATION = {
    DEFAULT_PAGE_SIZE: 100,
} as const;
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
