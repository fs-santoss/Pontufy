import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { prisma } from '@/backend/db';
import { logAudit } from '@/lib/audit';
import { sendWelcomeEmail, sendPasswordResetEmail } from '@/lib/email';

const scryptAsync = promisify(scrypt);
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
// Reject signatures whose timestamp is older than this to blunt replay attacks.
const SIGNATURE_TOLERANCE_SECONDS = 300;

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!secret || !signature) return false;

  const parts = signature.split(',');
  const tsEntry = parts.find((p) => p.startsWith('t='));
  const v1Entry = parts.find((p) => p.startsWith('v1='));
  if (!tsEntry || !v1Entry) return false;

  const timestamp = tsEntry.slice(2);
  const expectedSig = v1Entry.slice(3);

  // Replay protection: reject stale or non-numeric timestamps.
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - ts);
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false;

  const payload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return constantTimeEqual(computed, expectedSig);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

const DEFAULT_CREDITS: Record<string, number> = {
  starter: 50,
  professional: 200,
  enterprise: 1000,
};

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    if (STRIPE_WEBHOOK_SECRET) {
      const valid = await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET);
      if (!valid) {
        return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object;
    const metadata = session.metadata || {};

    const companyName = metadata.company_name;
    const email = session.customer_email || metadata.admin_email;
    const sector = metadata.sector || 'tech';
    const plan = metadata.plan || 'starter';

    if (!companyName || !email) {
      return NextResponse.json({ error: 'MISSING_METADATA' }, { status: 400 });
    }

    const existingTenant = await prisma.tenant.findFirst({
      where: { name: companyName },
    });

    if (existingTenant) {
      return NextResponse.json({ success: true, message: 'TENANT_EXISTS', tenantId: existingTenant.id });
    }

    // The admin sets their own password via a one-time setup link — we never
    // generate, store, or transmit a plaintext temporary password.
    const unusablePassword = await hashPassword(randomBytes(32).toString('hex'));
    const aiCredits = DEFAULT_CREDITS[plan] || DEFAULT_CREDITS.starter;
    const setupToken = randomBytes(32).toString('hex');
    const setupExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          sector,
          contractStatus: 'active',
          aiCredits,
        },
      });

      const admin = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: `Admin ${companyName}`,
          email,
          role: 'admin_rh',
          passwordHash: unusablePassword,
          pointsBalance: 0,
        },
      });

      await tx.passwordReset.create({
        data: { userId: admin.id, token: setupToken, expiresAt: setupExpiresAt },
      });

      return { tenant, admin };
    });

    await logAudit({
      tenantId: result.tenant.id,
      userId: result.admin.id,
      action: 'TENANT_ONBOARDED',
      newValues: {
        tenantId: result.tenant.id,
        companyName,
        sector,
        plan,
        adminEmail: email,
      },
    });

    await sendWelcomeEmail(email, `Admin ${companyName}`);
    // Deliver the password-setup link out-of-band (email), never in the response.
    await sendPasswordResetEmail(email, setupToken);

    return NextResponse.json({
      success: true,
      tenantId: result.tenant.id,
      adminEmail: email,
    });
  } catch (error) {
    console.error('POST /api/webhooks/stripe:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
