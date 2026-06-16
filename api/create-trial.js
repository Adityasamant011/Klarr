// api/create-trial.js — Create Stripe Checkout Session with 30-day free trial
// Single plan: $99/mo with 30-day free trial

const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = JSON.parse(req.body);

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Single plan: $99/mo with 30-day free trial
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_KLARR, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
      },
      success_url: `https://klarr.space/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}&trial=true`,
      cancel_url: `https://klarr.space/#pricing`,
      metadata: { plan: 'klarr', trial: 'true' },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Trial checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
};
