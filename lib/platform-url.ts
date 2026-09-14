import { Platform } from './types';

const PLATFORM_HOSTS: Record<Platform, string[]> = {
  shopee: ['shopee.co.th', 'shope.ee'],
  lazada: ['lazada.co.th', 's.lazada.co.th'],
  tiktok: ['tiktok.com', 'tiktokshop.com', 'shop.tiktok.com', 'vt.tiktok.com'],
};

const SEARCH_PATH_PREFIXES = ['/search', '/tag', '/keyword', '/catalog'];

/** Accept only direct marketplace product URLs or owned affiliate links. */
export function isUsablePlatformUrl(value: unknown, platform: Platform): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    const hostMatches = PLATFORM_HOSTS[platform].some(
      (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`),
    );
    if (!hostMatches || SEARCH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;

    if (platform === 'shopee') {
      const parts = path.split('/').filter(Boolean);
      const numericProduct = parts.length >= 3 && parts.at(-3) === 'product'
        && parts.slice(-2).every((part) => /^[0-9]+$/.test(part));
      const slugProduct = path.includes('-i.') && path.split('-i.')[1]?.includes('.');
      let decodedSearch = url.search.toLowerCase();
      try {
        decodedSearch = decodeURIComponent(decodedSearch);
      } catch {
        // Keep the encoded query when it is malformed.
      }
      return numericProduct || slugProduct || (
        host === 'shope.ee' && path === '/an_redir' && decodedSearch.includes('origin_link=') && decodedSearch.includes('/product/')
      );
    }

    if (platform === 'lazada') {
      const directLazadaPath = path.startsWith('/products/') && path.includes('-i') && path.includes('-s');
      return directLazadaPath || (host === 's.lazada.co.th' && path.startsWith('/s.'));
    }

    return (
      (host === 'vt.tiktok.com' && path.length > 1) ||
      (host === 'shop.tiktok.com' && (path.includes('/pdp/') || path.includes('/product/'))) ||
      (host === 'tiktok.com' && path.includes('/view/product/')) ||
      (host === 'tiktokshop.com' && path.includes('/product/'))
    );
  } catch {
    return false;
  }
}