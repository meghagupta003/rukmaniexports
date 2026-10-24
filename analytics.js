// Rukmani Exports — analytics.js
// GA4 + Google Consent Mode v2 + a quiet consent notice + event helpers.
// Replace GA_ID with your Measurement ID (Admin > Data Streams in GA4).

(function () {
  'use strict';

  var GA_ID = 'G-QRPTLTKVLD';
  var STORE_KEY = 'rukmani_consent_v1';

  // ---------- Consent Mode: everything denied until the visitor chooses ----------
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  function readChoice() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function saveChoice(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) { /* storage unavailable */ }
  }
  function applyConsent(granted) {
    gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied'
    });
  }

  // Restore a previous choice before the first hit is sent
  var saved = readChoice();
  if (saved === 'granted') applyConsent(true);

  // ---------- Load GA4 ----------
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  gtag('js', new Date());
  gtag('config', GA_ID, { anonymize_ip: true });

  // ---------- Consent notice (shown only until a choice is made) ----------
  function injectStyles() {
    var css = '' +
      '.rk-consent{position:fixed;left:24px;bottom:24px;z-index:9999;max-width:420px;' +
      'background:#F8F6F0;color:#3E332A;border:1px solid rgba(122,93,38,.35);border-radius:24px;' +
      'padding:22px 24px;box-shadow:0 12px 40px rgba(62,51,42,.14);font-size:14px;line-height:1.55;}' +
      '.rk-consent p{margin:0 0 14px;}' +
      '.rk-consent a{color:#7A5D26;text-decoration:underline;text-underline-offset:3px;}' +
      '.rk-consent-actions{display:flex;gap:10px;flex-wrap:wrap;}' +
      '.rk-consent button{font:inherit;cursor:pointer;border-radius:999px;padding:9px 20px;' +
      'border:1px solid #3E332A;background:#3E332A;color:#F8F6F0;}' +
      '.rk-consent button.rk-quiet{background:transparent;color:#3E332A;}' +
      '.rk-consent button:focus-visible{outline:2px solid #7A5D26;outline-offset:2px;}' +
      '@media (max-width:520px){.rk-consent{left:12px;right:12px;bottom:12px;max-width:none;}}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  function showBanner() {
    if (document.querySelector('.rk-consent')) return;
    injectStyles();
    var box = document.createElement('div');
    box.className = 'rk-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookie preferences');
    box.innerHTML =
      '<p>We use privacy-respecting analytics to understand which pages are useful to our visitors. ' +
      'Nothing is used for advertising. <a href="privacy.html">Read our privacy notice</a>.</p>' +
      '<div class="rk-consent-actions">' +
      '<button type="button" data-choice="granted">Accept</button>' +
      '<button type="button" class="rk-quiet" data-choice="denied">Decline</button>' +
      '</div>';
    box.addEventListener('click', function (e) {
      var choice = e.target && e.target.getAttribute('data-choice');
      if (!choice) return;
      saveChoice(choice);
      applyConsent(choice === 'granted');
      box.remove();
    });
    document.body.appendChild(box);
  }

  // ---------- Event helpers ----------
  // Call from your own code, e.g. inside inquire.js after a successful submit:
  //   window.rukmaniTrack.lead('trade')   // 'trade' | 'collector' | 'general'
  window.rukmaniTrack = {
    lead: function (inquiryType) {
      gtag('event', 'generate_lead', { inquiry_type: inquiryType || 'general' });
    },
    viewItem: function (name, stoneType, treatment) {
      gtag('event', 'view_item', {
        items: [{ item_name: name, item_category: stoneType, item_variant: treatment }]
      });
    },
    whatsapp: function (location) {
      gtag('event', 'whatsapp_click', { click_location: location || location_path() });
    }
  };
  function location_path() { return window.location.pathname; }

  document.addEventListener('DOMContentLoaded', function () {
    // WhatsApp links, tracked automatically wherever they appear
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
      if (a) window.rukmaniTrack.whatsapp();
    });

    // Phone links
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="tel:"]');
      if (a) gtag('event', 'phone_click', { click_location: window.location.pathname });
    });

    // Any element with data-cookie-settings reopens the notice (e.g. a footer link)
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (el) { e.preventDefault(); showBanner(); }
    });

    if (!readChoice()) showBanner();
  });
})();
