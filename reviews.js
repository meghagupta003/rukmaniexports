// ============================================
// Rukmani Exports — Customer Reviews Widget
// ============================================
// Uses its own Airtable table so reviews can be managed independently
// of inventory. See GOOGLE-SHEETS... no — see AIRTABLE-SETUP-GUIDE.md,
// "Reviews Table" section, for exact column setup.
const REVIEWS_TABLE = 'Reviews';
const REVIEWS_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REVIEWS_TABLE)}`;

function starRow(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 5));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function renderReviewCard(record) {
  const f = record.fields;
  const hasPhoto = f['Photo'] && f['Photo'].length > 0;
  return `
    <div class="review-card">
      ${hasPhoto ? `<div class="review-photo" style="background-image:url('${f['Photo'][0].url}')"></div>` : ''}
      <div class="review-stars" aria-label="${f['Rating'] || 5} out of 5 stars">${starRow(f['Rating'])}</div>
      <p class="review-quote">"${(f['Quote'] || '').trim()}"</p>
      <p class="review-author">${f['Name'] || 'Verified Customer'}${f['Location'] ? ' · ' + f['Location'] : ''}</p>
    </div>`;
}

async function loadReviews(containerSelector, limit = 6) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (AIRTABLE_BASE_ID.includes('YOUR_BASE_ID')) {
    container.innerHTML = `<p style="padding:2.5rem; font-size:0.9rem; color:var(--espresso-faint);">Reviews aren't connected yet — see the setup guide to go live.</p>`;
    return;
  }

  try {
    const formula = encodeURIComponent(`{Status}='Approved'`);
    const res = await fetch(`${REVIEWS_URL}?filterByFormula=${formula}&maxRecords=${limit}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    if (!res.ok) throw new Error('Airtable responded with ' + res.status);
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.innerHTML = data.records.map(renderReviewCard).join('');
  } catch (err) {
    console.error('Reviews load failed:', err);
    container.style.display = 'none';
  }
}
