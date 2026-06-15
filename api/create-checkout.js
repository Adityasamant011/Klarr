// api/create-checkout.js — Create Stripe Checkout Session
// Deploy this to Vercel as a serverless function

const Stripe = require('stripe');

// Price IDs — replace with your actual Stripe price IDs
const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  pro: process.env.STRIPE_PRICE_PRO,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, email, uid } = JSON.parse(req.body);

    if (!PRICES[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      success_url: `https://klarr.space/dashboard.html?payment=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://klarr.space/#pricing`,
      metadata: { uid, plan },
      client_reference_id: uid,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
};
