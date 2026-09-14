import { Platform, ProductDeal } from './types';
import { isUsablePlatformUrl } from './platform-url';

type AnyRecord = Record<string, any>;

/** Validate localStorage deals without importing the server-only catalog loader. */
export function isValidPersistedDeal(value: unknown): value is ProductDeal {
  if (!value || typeof value !== 'object') return false;
  const deal = value as AnyRecord;
  const platform = deal.platform as Platform;
  const img = String(deal.imageUrl || '');
  if (img.includes('unsplash.com') || img.includes('/icon-192.png')) return false;

  const affUrl = String(deal.affiliateUrl || '');
  if (
    affUrl.includes('/search') ||
    affUrl.includes('/catalog') ||
    affUrl.includes('/tag/') ||
    affUrl.includes('keyword=') ||
    affUrl.includes('?q=')
  ) return false;

  if (Array.isArray(deal.stores)) {
    const hasInvalidStore = deal.stores.some((store: AnyRecord) =>
      !store || !isUsablePlatformUrl(store.url, store.platform as Platform),
    );
    if (hasInvalidStore) return false;
  }

  return Boolean(
    deal.id &&
    deal.title &&
    isUsablePlatformUrl(deal.affiliateUrl, platform),
  );
}
