// ============================================
// Rukmani Exports — Checkout
// Sends the current cart to a small serverless function, which talks to
// Stripe securely (server-side) and returns a real Stripe Checkout URL.
// ============================================

// Fill this in once your serverless function is deployed (see STRIPE-SETUP-GUIDE.md).
// Example: 'https://rukmani-exports-api.vercel.app/api/create-checkout-session'
const CHECKOUT_ENDPOINT = 'YOUR_DEPLOYED_FUNCTION_URL_HERE';

async function startCheckout() {
  const cart = getCart();
  if (!cart.length) return;

  if (CHECKOUT_ENDPOINT.includes('YOUR_DEPLOYED_FUNCTION_URL')) {
    alert('Checkout isn\'t connected yet. See STRIPE-SETUP-GUIDE.md to finish this last step.');
    return;
  }

  const btn = document.getElementById('checkout-btn');
  const originalText = btn.textContent;
  btn.textContent = 'Redirecting to secure checkout…';
  btn.disabled = true;

  try {
    const res = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty
        })),
        successUrl: window.location.origin + '/next-steps.html?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: window.location.origin + '/cart.html'
      })
    });

    if (!res.ok) throw new Error('Checkout session creation failed: ' + res.status);
    const data = await res.json();

    if (data.url) {
      window.location.href = data.url; // hand off to Stripe's own secure checkout page
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (err) {
    console.error(err);
    btn.textContent = originalText;
    btn.disabled = false;
    alert('Something went wrong starting checkout. Please try again, or contact us directly.');
  }
}
