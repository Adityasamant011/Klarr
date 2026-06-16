// api/create-trial.js — Create Stripe Checkout Session with 30-day free trial
// Deploy this to Vercel as a serverless function

const Stripe = require('stripe');

// Price IDs — these should match your Stripe price IDs
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
    const { plan, email } = JSON.parse(req.body);

    if (!PRICES[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create Stripe checkout session with 30-day free trial
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: PRICES[plan], quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        trial_settings: {
          end_behavior: { missing_payment_method: 'cancel' }
        }
      },
      success_url: `https://klarr.space/dashboard?payment=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}&trial=true`,
      cancel_url: `https://klarr.space/#pricing`,
      metadata: { plan, trial: 'true' },
      // Don't require payment method for trial
      payment_method_collection: 'if_required',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Trial checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
};
