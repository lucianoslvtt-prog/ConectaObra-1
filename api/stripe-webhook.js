// Disable Vercel's automatic body parsing so we receive the raw body
// This is critical for Stripe webhook signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to read raw body from the request stream
function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
        console.error('Missing environment variables for webhook');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // ── Read raw body and verify Stripe signature ──
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
        const rawBody = await getRawBody(req);
        const payload = rawBody.toString('utf8');

        // Parse the signature header
        const elements = sig.split(',');
        const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
        const signatures = elements
            .filter(e => e.startsWith('v1='))
            .map(e => e.split('=')[1]);

        if (!timestamp || signatures.length === 0) {
            return res.status(400).json({ error: 'Invalid signature format' });
        }

        // Check timestamp tolerance (5 minutes)
        const tolerance = 300;
        const now = Math.floor(Date.now() / 1000);
        if (now - parseInt(timestamp) > tolerance) {
            return res.status(400).json({ error: 'Webhook timestamp too old' });
        }

        // Compute expected signature using HMAC-SHA256
        const crypto = await import('crypto');
        const signedPayload = `${timestamp}.${payload}`;
        const expectedSig = crypto
            .createHmac('sha256', webhookSecret)
            .update(signedPayload)
            .digest('hex');

        // Compare signatures (timing-safe)
        const isValid = signatures.some(s => {
            try {
                return crypto.timingSafeEqual(
                    Buffer.from(expectedSig),
                    Buffer.from(s)
                );
            } catch {
                return false;
            }
        });

        if (!isValid) {
            console.error('Webhook signature verification failed');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        event = JSON.parse(payload);
    } catch (err) {
        console.error('Webhook verification error:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // ── Handle checkout.session.completed ──
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata?.userId;

        if (!userId) {
            console.error('No userId in session metadata');
            return res.status(400).json({ error: 'Missing userId in metadata' });
        }

        console.log(`Processing checkout.session.completed for user: ${userId}`);

        try {
            // Use Supabase REST API with service_role key (bypasses RLS)
            const headers = {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=minimal',
            };

            // 1. Activate subscription in professionals table
            const proResponse = await fetch(
                `${supabaseUrl}/rest/v1/professionals?user_id=eq.${userId}`,
                {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        subscription_status: 'active',
                        stripe_customer_id: session.customer || null,
                        stripe_subscription_id: session.subscription || null,
                    }),
                }
            );

            if (!proResponse.ok) {
                const errText = await proResponse.text();
                console.error('Failed to update professionals:', errText);
            }

            // 2. Set role to 'professional' and clear pending flag
            // THIS IS THE ONLY PLACE where role changes to 'professional'
            const profileResponse = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
                {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        role: 'professional',
                        pending_professional: false,
                    }),
                }
            );

            if (!profileResponse.ok) {
                const errText = await profileResponse.text();
                console.error('Failed to update profiles:', errText);
            }

            console.log(`Successfully activated professional for user: ${userId}`);
            return res.status(200).json({ received: true });

        } catch (err) {
            console.error('Database update error:', err);
            return res.status(500).json({ error: 'Database update failed' });
        }
    }

    // For other event types, acknowledge receipt
    return res.status(200).json({ received: true });
}
