import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { AffiliateSource, FeedPage } from './types';

const MAX_FEED_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'ip6-localhost']);

function isPrivateOrReservedIp(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];
  const version = isIP(normalized);
  if (version === 4) {
    const octets = normalized.split('.').map(Number);
    const [first, second] = octets;
    return first === 0 || first === 10 || first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && (second === 0 || second === 168)) ||
      (first === 198 && (second === 18 || second === 19)) ||
      (first === 203 && second === 0) ||
      first >= 224;
  }
  if (version === 6) {
    if (normalized.startsWith('::ffff:')) return isPrivateOrReservedIp(normalized.slice(7));
    const firstHextet = Number.parseInt(normalized.split(':')[0] || '0', 16);
    return normalized === '::' || normalized === '::1' ||
      (firstHextet & 0xfe00) === 0xfc00 ||
      (firstHextet & 0xffc0) === 0xfe80 ||
      (firstHextet & 0xff00) === 0xff00;
  }
  return true;
}

async function assertSafeFeedUrl(feedUrl: string): Promise<URL> {
  const parsedUrl = new URL(feedUrl);
  if (parsedUrl.protocol !== 'https:') throw new Error('official_feed_must_use_https');

  const hostname = parsedUrl.hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('official_feed_private_host_blocked');
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) throw new Error('official_feed_private_ip_blocked');
    return parsedUrl;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw new Error('official_feed_private_ip_blocked');
  }
  return parsedUrl;
}

function parseCsv(input: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      cell = '';
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  for (const key of ['items', 'products', 'results', 'data']) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
  }
  return [];
}

async function readFeed(response: Response): Promise<{ rows: Record<string, unknown>[]; nextCursor: string | number | null }> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FEED_BYTES) {
    throw new Error('official_feed_too_large');
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_FEED_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error('official_feed_too_large');
      }
      chunks.push(value);
    }
  }

  const buffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(buffer);
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    const payload = JSON.parse(text) as Record<string, unknown> | unknown[];
    const record = !Array.isArray(payload) && payload && typeof payload === 'object' ? payload : {};
    const nextCursor = typeof record.next_cursor === 'string' || typeof record.next_cursor === 'number'
      ? record.next_cursor
      : typeof record.nextCursor === 'string' || typeof record.nextCursor === 'number'
        ? record.nextCursor
        : null;
    return { rows: extractRows(payload), nextCursor };
  }

  return { rows: parseCsv(text), nextCursor: null };
}

export async function fetchOfficialFeedPage(
  source: AffiliateSource,
  cursor: Record<string, unknown>,
): Promise<FeedPage> {
  if (!['official_api', 'official_feed', 'manual_export'].includes(source.provider)) {
    throw new Error('source_provider_not_supported');
  }

  const feedUrl = process.env[source.feed_env_key];
  if (!feedUrl) throw new Error(`missing_feed_env:${source.feed_env_key}`);
  const parsedUrl = await assertSafeFeedUrl(feedUrl);
  const requestedCursor = typeof cursor.providerCursor === 'string' || typeof cursor.providerCursor === 'number'
    ? String(cursor.providerCursor)
    : null;
  if (requestedCursor) parsedUrl.searchParams.set('cursor', requestedCursor);

  const headers = new Headers({ Accept: 'application/json, text/csv;q=0.9' });
  if (source.auth_env_key) {
    const token = process.env[source.auth_env_key];
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(parsedUrl, {
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`official_feed_http_${response.status}`);

  const { rows, nextCursor: providerCursor } = await readFeed(response);
  const offset = typeof cursor.offset === 'number' && cursor.offset >= 0 ? cursor.offset : 0;
  const batchSize = Math.max(1, Math.min(250, source.batch_size || 50));
  const items = rows.slice(offset, offset + batchSize);
  const localDone = offset + items.length >= rows.length;
  const nextCursor = providerCursor ?? (localDone ? null : offset + items.length);

  return {
    items,
    nextCursor,
    done: nextCursor === null || items.length === 0,
  };
}
