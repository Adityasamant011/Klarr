// Vercel serverless function — Stripe webhook handler
// Deploy to Vercel: https://vercel.com

const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook Error: ' + err.message });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_email || session.customer_details?.email;
        const plan = getPlanFromSession(session);

        if (email && plan) {
          console.log(`Payment successful: ${email} → ${plan}`);
          // Send email notification via Formspree
          await fetch('https://formspree.io/f/maqzzdwr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              name: email,
              email: email,
              store: 'Stripe Subscription',
              revenue: '$' + (session.amount_total / 100) + ' ' + session.currency.toUpperCase(),
              adSpend: 'N/A',
              subject: '🎉 New Klarr Subscription: ' + email,
              message: 'NEW PAID SUBSCRIPTION!\n\nEmail: ' + email + '\nPlan: ' + plan + '\nAmount: $' + (session.amount_total / 100) + ' ' + session.currency.toUpperCase() + '\nTime: ' + new Date().toISOString()
            })
          }).catch(e => console.error('Email notification failed:', e));
          // Note: Firestore update happens via client-side redirect
          // This webhook is for backup/reliability
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription cancelled:', subscription.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

function getPlanFromSession(session) {
  // Map Stripe price IDs to plan names
  const priceMap = {
    // Replace with your actual Stripe price IDs
    'price_xxx_starter': 'starter',
    'price_xxx_growth': 'growth',
    'price_xxx_pro': 'pro',
  };

  if (session.line_items?.data?.[0]?.price?.id) {
    return priceMap[session.line_items.data[0].price.id];
  }

  // Fallback: check metadata
  return session.metadata?.plan || null;
}
