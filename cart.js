// ============================================
// Rukmani Exports — Real Shopping Cart
// Persists across pages and browser sessions using localStorage.
// This is the client-side half of the cart; checkout.js talks to Stripe.
// ============================================

const CART_KEY = 're_cart_v1';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item) {
  // item: { id, name, price, origin, treatment, lab, image }
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  if (typeof renderCartPage === 'function') renderCartPage();
}

function updateQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty = Math.max(1, parseInt(qty, 10) || 1);
    saveCart(cart);
    if (typeof renderCartPage === 'function') renderCartPage();
  }
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, i) => sum + (Number(i.price) || 0) * i.qty, 0);
}

function formatUSD(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

// Updates the little bag-count badge in the header, on every page that has one.
function updateCartBadge() {
  const badge = document.getElementById('bagCount');
  if (badge) badge.textContent = cartCount();
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
