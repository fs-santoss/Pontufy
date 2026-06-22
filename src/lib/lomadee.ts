const API_URL = process.env.LOMADEE_API_URL || 'https://api.lomadee.com';
const APP_TOKEN = process.env.LOMADEE_APP_TOKEN || '';
const SOURCE_ID = process.env.LOMADEE_SOURCE_ID || '';

interface LomadeeOffer {
  id: string;
  name: string;
  link: string;
  thumbnail: string;
  price: number;
  store: { name: string; image: string };
  category: { name: string };
}

interface LomadeeCoupon {
  id: string;
  description: string;
  code: string;
  discount: number;
  store: { name: string; image: string };
  link: string;
  vigency: string;
}

interface LomadeeLinkResponse {
  redirectUrl: string;
}

export interface FormattedOffer {
  id: string;
  title: string;
  image: string;
  price: number;
  store: string;
  storeImage: string;
  category: string;
  link: string;
}

export interface FormattedCoupon {
  id: string;
  description: string;
  code: string;
  discount: number;
  store: string;
  storeImage: string;
  link: string;
  validUntil: string;
}

async function lomadeeFetch<T>(path: string): Promise<T> {
  if (!APP_TOKEN) {
    throw new Error('LOMADEE_APP_TOKEN not configured');
  }

  const url = `${API_URL}/v2/${APP_TOKEN}${path}${path.includes('?') ? '&' : '?'}sourceId=${SOURCE_ID}`;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Lomadee API ${res.status}: ${text.substring(0, 200)}`);
  }

  return res.json();
}

export async function searchOffers(keyword: string): Promise<FormattedOffer[]> {
  const data = await lomadeeFetch<{ offers: LomadeeOffer[] }>(
    `/offer/_search?keyword=${encodeURIComponent(keyword)}`,
  );

  if (!data.offers || !Array.isArray(data.offers)) return [];

  return data.offers.map((o) => ({
    id: String(o.id),
    title: o.name,
    image: o.thumbnail,
    price: o.price,
    store: o.store?.name || '',
    storeImage: o.store?.image || '',
    category: o.category?.name || '',
    link: o.link,
  }));
}

export async function getCoupons(): Promise<FormattedCoupon[]> {
  const data = await lomadeeFetch<{ coupons: LomadeeCoupon[] }>(
    '/coupon/_all',
  );

  if (!data.coupons || !Array.isArray(data.coupons)) return [];

  return data.coupons.map((c) => ({
    id: String(c.id),
    description: c.description,
    code: c.code,
    discount: c.discount,
    store: c.store?.name || '',
    storeImage: c.store?.image || '',
    link: c.link,
    validUntil: c.vigency,
  }));
}

/**
 * Injects userId as a subId tracking param into a base URL before
 * sending to Lomadee. Uses the native URL API for safe query manipulation.
 * Returns the original url unchanged if it is malformed.
 */
export function buildTrackedUrl(baseUrl: string, userId: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('subId', userId);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export async function createAffiliateLink(
  productUrl: string,
  userId?: string,
): Promise<string> {
  const trackedUrl = userId ? buildTrackedUrl(productUrl, userId) : productUrl;

  const data = await lomadeeFetch<{ links: LomadeeLinkResponse[] }>(
    `/link/_create?url=${encodeURIComponent(trackedUrl)}`,
  );

  if (!data.links || data.links.length === 0) {
    throw new Error('Lomadee returned no affiliate link');
  }

  return data.links[0].redirectUrl;
}
