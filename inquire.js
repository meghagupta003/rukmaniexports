// ============================================
// Rukmani Exports — Inquire Now (Sheets + WhatsApp)
// ============================================
// Fill in this one value once you've deployed the Google Apps Script
// Web App (see GOOGLE-SHEETS-SETUP-GUIDE.md).
const SHEETS_WEBAPP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

// Your WhatsApp Business number, digits only, with country code, no + or spaces.
const WHATSAPP_NUMBER = '918947846084';

function injectInquireModal() {
  if (document.getElementById('inquireModal')) return;
  const modal = document.createElement('div');
  modal.id = 'inquireModal';
  modal.className = 'inquire-overlay';
  modal.setAttribute('role', 'presentation');
  modal.innerHTML = `
    <div class="inquire-box" role="dialog" aria-modal="true" aria-labelledby="inquireTitle">
      <button class="inquire-close" onclick="closeInquireModal()" aria-label="Close inquiry form">×</button>
      <div id="inquireFormView">
        <p class="eyebrow" style="margin-bottom:0.6rem;">Inquire Now</p>
        <h3 id="inquireTitle" style="font-size:1.5rem; margin-bottom:1.2rem;">Tell Us What You're Interested In</h3>
        <form id="inquireForm">
          <div class="form-row">
            <label for="inq-name">Name</label>
            <input type="text" id="inq-name" name="name" required>
          </div>
          <div class="form-row">
            <label for="inq-email">Email</label>
            <input type="email" id="inq-email" name="email" required>
          </div>
          <div class="form-row">
            <label for="inq-phone">Phone (optional)</label>
            <input type="tel" id="inq-phone" name="phone">
          </div>
          <div class="form-row">
            <label for="inq-type">I'm reaching out as a</label>
            <select id="inq-type" name="type">
              <option>Private Collector</option>
              <option>Trade Buyer</option>
              <option>General Inquiry</option>
            </select>
          </div>
          <div class="form-row">
            <label for="inq-item">Item of Interest</label>
            <input type="text" id="inq-item" name="item">
          </div>
          <div class="form-row">
            <label for="inq-message">Message</label>
            <textarea id="inq-message" name="message" rows="3"></textarea>
          </div>
          <button type="submit" class="btn btn-solid" style="width:100%; justify-content:center; border:none;">Send Inquiry</button>
        </form>
      </div>
      <div id="inquireSuccessView" style="display:none; text-align:center; padding:1rem 0;" role="status">
        <p style="font-family:var(--font-display); font-size:1.4rem; margin-bottom:0.8rem;">Thank You.</p>
        <p style="margin-bottom:1.6rem;">We've received your inquiry and read every one personally. For the fastest response, you can also message us directly on WhatsApp:</p>
        <a href="#" id="whatsappFollowup" target="_blank" rel="noopener" class="btn btn-solid" style="border:none; display:inline-flex;">Message Us on WhatsApp →</a>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('inquireForm').addEventListener('submit', handleInquireSubmit);

  // Close on overlay click (but not when clicking inside the form box itself)
  modal.addEventListener('click', (e) => { if (e.target === modal) closeInquireModal(); });

  // Close on Escape, and trap Tab focus within the modal while open
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeInquireModal(); return; }
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button, input, select, textarea, a[href]');
      const list = Array.from(focusable).filter(el => el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

let __inquireTriggerEl = null;

function openInquireModal(itemName) {
  __inquireTriggerEl = document.activeElement;
  injectInquireModal();
  const modal = document.getElementById('inquireModal');
  modal.classList.add('open');
  document.getElementById('inquireFormView').style.display = 'block';
  document.getElementById('inquireSuccessView').style.display = 'none';
  document.getElementById('inquireForm').reset();
  if (itemName) document.getElementById('inq-item').value = itemName;
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('inq-name').focus(), 50);
}

function closeInquireModal() {
  const modal = document.getElementById('inquireModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  if (__inquireTriggerEl) __inquireTriggerEl.focus();
}

async function handleInquireSubmit(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('inq-name').value,
    email: document.getElementById('inq-email').value,
    phone: document.getElementById('inq-phone').value,
    type: document.getElementById('inq-type').value,
    item: document.getElementById('inq-item').value,
    message: document.getElementById('inq-message').value,
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Sending…';
  submitBtn.disabled = true;

  try {
    if (!SHEETS_WEBAPP_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL')) {
      await fetch(SHEETS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script Web Apps don't return CORS headers; response can't be read, but the write still succeeds
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
      });
    } else {
      console.warn('Sheets not connected yet — see GOOGLE-SHEETS-SETUP-GUIDE.md');
    }
  } catch (err) {
    console.error('Inquiry submission failed:', err);
  }

  // Build the pre-filled WhatsApp message regardless of Sheets success,
  // so the customer always has a reliable way to reach you.
  const waText = encodeURIComponent(
    `Hello Rukmani Exports, I'd like to inquire about: ${data.item || '(general inquiry)'}\n\n` +
    `Name: ${data.name}\nEmail: ${data.email}\n${data.phone ? 'Phone: ' + data.phone + '\n' : ''}` +
    `I'm reaching out as: ${data.type}\n\n${data.message ? 'Message: ' + data.message : ''}`
  );
  document.getElementById('whatsappFollowup').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;

  document.getElementById('inquireFormView').style.display = 'none';
  document.getElementById('inquireSuccessView').style.display = 'block';
  submitBtn.textContent = 'Send Inquiry';
  submitBtn.disabled = false;
}

document.addEventListener('DOMContentLoaded', injectInquireModal);
