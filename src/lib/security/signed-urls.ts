import crypto from 'crypto';

const SIGNING_SECRET = process.env.AUTH_SECRET || 'fallback-dev-secret-only-do-not-use-in-prod';

/**
 * Generates a cryptographically signed, short-lived URL.
 */
export function generateSignedUrl(baseUrl: string, payload: Record<string, string>, ttlSeconds: number): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  
  const url = new URL(baseUrl);
  url.searchParams.set('exp', expiresAt.toString());
  
  for (const [key, value] of Object.entries(payload)) {
    url.searchParams.set(key, value);
  }

  // Sort params to ensure consistent signature generation
  const sortedParams = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
  const queryStringToSign = new URLSearchParams(sortedParams).toString();

  const signature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(queryStringToSign)
    .digest('hex');

  url.searchParams.set('sig', signature);
  
  return url.toString();
}

/**
 * Verifies a cryptographically signed URL.
 */
export function verifySignedUrl(urlToVerify: string): boolean {
  try {
    const url = new URL(urlToVerify);
    const signature = url.searchParams.get('sig');
    const expStr = url.searchParams.get('exp');

    if (!signature || !expStr) return false;

    const expiresAt = parseInt(expStr, 10);
    if (Date.now() / 1000 > expiresAt) {
      return false; // URL has expired
    }

    // Reconstruct the URL without the signature to verify the hash
    url.searchParams.delete('sig');
    const sortedParams = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    const queryStringToSign = new URLSearchParams(sortedParams).toString();

    const expectedSignature = crypto
      .createHmac('sha256', SIGNING_SECRET)
      .update(queryStringToSign)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const bufferSig = Buffer.from(signature, 'hex');
    const bufferExpected = Buffer.from(expectedSignature, 'hex');
    
    if (bufferSig.length !== bufferExpected.length) return false;

    return crypto.timingSafeEqual(bufferSig, bufferExpected);
  } catch (error) {
    return false; // Malformed URL
  }
}
