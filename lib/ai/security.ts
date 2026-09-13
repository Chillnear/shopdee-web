/**
 * AI Security Shield & Rate Limiter for ShopDee
 * เกราะป้องกันความปลอดภัย 7 ชั้น: ป้องกันการยิงสแปม, เจาะระบบ, ขโมย Quota และ Prompt Injection
 */

import { NextRequest } from 'next/server';

// 1. In-Memory Sliding-Window Rate Limiter
interface RateLimitRecord {
  timestamps: number[];
}

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 นาที
const MAX_REQUESTS_PER_WINDOW = 10;  // สูงสุด 10 ครั้งต่อนาทีต่อ IP
const ipRateLimitMap = new Map<string, RateLimitRecord>();

// Periodic cleanup เพื่อไม่ให้ memory บวม
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    ipRateLimitMap.forEach((record, ip) => {
      record.timestamps = record.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (record.timestamps.length === 0) {
        ipRateLimitMap.delete(ip);
      }
    });
  }, 120_000);
}

export function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipRateLimitMap.get(clientIp) || { timestamps: [] };

  // กรองเอาเฉพาะ timestamp ที่อยู่ในรอบ 1 นาทีล่าสุด
  const recentTimestamps = record.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRateLimitMap.set(clientIp, { timestamps: recentTimestamps });
    return { allowed: false, remaining: 0 };
  }

  recentTimestamps.push(now);
  ipRateLimitMap.set(clientIp, { timestamps: recentTimestamps });
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - recentTimestamps.length };
}

// 2. Input Sanitization & Prompt Injection Filter
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+are\s+now\s+(an?\s+)?unrestricted/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /human\s*:/i,
  /dan\s+mode/i,
  /jailbreak/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
];

export function validateAndSanitizeInput(rawInput: unknown): { isValid: boolean; sanitized: string; reason?: string } {
  if (typeof rawInput !== 'string') {
    return { isValid: false, sanitized: '', reason: 'Input must be a string' };
  }

  const trimmed = rawInput.trim();

  // กรองความยาว: ห้ามว่าง และห้ามเกิน 120 ตัวอักษร
  if (trimmed.length === 0) {
    return { isValid: false, sanitized: '', reason: 'Input is empty' };
  }
  if (trimmed.length > 120) {
    return { isValid: false, sanitized: '', reason: 'Input exceeds maximum length (120 chars)' };
  }

  // ตรวจจับ Prompt Injection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, sanitized: '', reason: 'Suspicious prompt injection detected' };
    }
  }

  // ลบอักขระควบคุม (Control characters)
  const sanitized = trimmed.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  return { isValid: true, sanitized };
}

// 3. Origin & Anti-Scraping Verification
export function verifyOriginAndHeaders(req: NextRequest): { isAuthorized: boolean; reason?: string } {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  // ถ้าเป็นการเรียกใช้งานในระดับ Local Dev อนุญาตเสมอ
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    return { isAuthorized: true };
  }

  // ตรวจสอบว่า Origin หรือ Referer ตรงกับ Host ของเราหรือไม่
  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return { isAuthorized: false, reason: 'Cross-origin request blocked' };
    }
  }

  if (referer && host) {
    const refererHost = new URL(referer).host;
    if (refererHost !== host) {
      return { isAuthorized: false, reason: 'Untrusted referer blocked' };
    }
  }

  return { isAuthorized: true };
}

// 4. In-Memory Query Cache (LRU-like with 1-hour TTL)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 ชั่วโมง

export function getCachedQuery<T>(normalizedKey: string): T | null {
  const entry = queryCache.get(normalizedKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(normalizedKey);
    return null;
  }
  return entry.data;
}

export function setCachedQuery<T>(normalizedKey: string, data: T): void {
  // จำกัดขนาดแคชไม่เกิน 1,000 รายการเพื่อประหยัด RAM
  if (queryCache.size > 1000) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) queryCache.delete(firstKey);
  }

  queryCache.set(normalizedKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
