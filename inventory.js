// ============================================
// Rukmani Exports — Airtable-Powered Inventory
// ============================================
// Fill in these three values once you've created your Airtable base
// (see the setup guide provided alongside this file).
const AIRTABLE_BASE_ID   = 'app3xWJf4OEurwme5';       // e.g. 'appXXXXXXXXXXXXXX'
const AIRTABLE_TABLE     = 'Gemstones';
const AIRTABLE_TOKEN     = 'patBonBRYBXmyLqok.69f4fba3df0f8433b5429d6d515b3a30f58d9a7f7d8cd95df62f0a887cb913a8'; // Personal Access Token — READ ONLY, scoped to this base only

const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;

function formatPrice(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

function gemFacetSVG(colorMain, colorLight) {
  return `<svg viewBox="0 0 200 180"><polygon points="100,10 170,55 170,125 100,170 30,125 30,55" fill="${colorMain}"/><polygon points="100,45 140,68 140,112 100,135 60,112 60,68" fill="${colorLight}"/></svg>`;
}

// Renders one inventory card. Falls back to a simple faceted illustration if no photo is set yet.
function renderStoneCard(record) {
  const f = record.fields;
  const isDirect = f['Listing Type'] === 'Direct Purchase';
  const hasImage = f['Image'] && f['Image'].length > 0;
  const figure = hasImage
    ? `<div class="stone-figure" style="background-image:url('${f['Image'][0].url}'); background-size:cover; background-position:center;"></div>`
    : `<div class="stone-figure">${gemFacetSVG('#8A1D28', '#C24550')}</div>`;

  const priceLine = isDirect && f['Price']
    ? `<div class="price">${formatPrice(f['Price'])}</div>`
    : '';

  const cta = isDirect
    ? `<a href="product.html?id=${record.id}" class="text-link">View Details →</a>`
    : `<a href="product.html?id=${record.id}" class="text-link">Inquire About This Piece →</a>`;

  return `
    <div class="stone-card">
      ${figure}
      <span class="tag">${isDirect ? 'Direct Purchase' : 'Inquire'}</span>
      <h4>${f['Name'] || 'Untitled Stone'}</h4>
      <div class="meta">${[f['Origin'], f['Treatment'], f['Certification Lab'] ? f['Certification Lab'] + ' Certified' : ''].filter(Boolean).join(' · ')}</div>
      ${priceLine}
      ${cta}
    </div>`;
}

// Fetches and renders all Active stones for a given category into a container element.
async function loadCategory(category, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (AIRTABLE_BASE_ID.includes('YOUR_BASE_ID')) {
    container.innerHTML = `<p style="padding:2.5rem; font-size:0.9rem; color:var(--espresso-faint);">Inventory isn't connected yet — add your Airtable Base ID and token in <code>inventory.js</code> to go live. See the setup guide.</p>`;
    return;
  }

  container.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">Loading inventory…</p>`;

  try {
    const formula = encodeURIComponent(`AND({Status}='Active',{Category}='${category}')`);
    const res = await fetch(`${AIRTABLE_URL}?filterByFormula=${formula}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    if (!res.ok) throw new Error('Airtable responded with ' + res.status);
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      container.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">New stones in this category are being added soon — please check back, or inquire directly.</p>`;
      return;
    }
    container.innerHTML = data.records.map(renderStoneCard).join('');
  } catch (err) {
    console.error('Inventory load failed:', err);
    container.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">Inventory is temporarily unavailable. Please check back shortly, or contact us directly.</p>`;
  }
}

// Fetches a single record by Airtable record ID (used on product.html)
async function loadProduct(recordId, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  try {
    const res = await fetch(`${AIRTABLE_URL}/${recordId}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    if (!res.ok) throw new Error('Airtable responded with ' + res.status);
    const record = await res.json();
    renderProductDetail(record, container);
  } catch (err) {
    console.error('Product load failed:', err);
    container.innerHTML = `<p style="padding:3rem; color:var(--espresso-faint);">This stone could not be loaded. It may have been sold or the link may be out of date — please <a href="contact.html">contact us</a> directly.</p>`;
  }
}

function renderProductDetail(record, container) {
  const f = record.fields;
  const isDirect = f['Listing Type'] === 'Direct Purchase';
  const hasImage = f['Image'] && f['Image'].length > 0;
  const figure = hasImage
    ? `<img src="${f['Image'][0].url}" alt="${f['Name'] || ''}" style="width:100%; max-width:320px;">`
    : gemFacetSVG('#8A1D28', '#C24550').replace('viewBox="0 0 200 180"', 'viewBox="0 0 200 180" style="width:100%; max-width:280px;"');

  const specRows = [
    ['Origin', f['Origin']],
    ['Weight', f['Carat'] ? f['Carat'] + ' carats' : ''],
    ['Cut', f['Cut']],
    ['Treatment', f['Treatment']],
    ['Certification', [f['Certification Lab'], f['Certificate Number'] ? '— Certificate #' + f['Certificate Number'] : ''].filter(Boolean).join(' ')],
    ['Color', f['Color']],
  ].filter(row => row[1]);

  const specHTML = specRows.map(([label, val]) => `<tr><td>${label}</td><td>${val}</td></tr>`).join('');

  const actionHTML = isDirect
    ? `
      <div class="price-tag">${f['Price'] ? formatPrice(f['Price']) : ''} <span style="font-size:1rem; font-weight:400; color:var(--espresso-faint);">USD</span></div>
      <button class="btn btn-solid" style="border:none;" onclick="this.textContent='✓ Added to Bag'">Add to Bag${f['Price'] ? ' — ' + formatPrice(f['Price']) : ''}</button>
    `
    : `
      <a href="contact.html" class="btn btn-solid">Inquire About This Piece</a>
      <p style="font-size:0.86rem; color:var(--espresso-faint); max-width:44ch; margin-top:1rem;">Stones of this rarity are offered through a personal consultation, so you receive this stone's complete provenance and certification history directly from our team — not simply a listing.</p>
    `;

  container.innerHTML = `
    <p class="eyebrow" style="margin-bottom:1.5rem;"><a href="loose-gemstones.html" style="color:inherit;">Loose Gemstones</a> / ${f['Category'] || ''} / ${f['Name'] || ''}</p>
    <div class="split reveal in" style="align-items:flex-start;">
      <div class="product-figure">${figure}</div>
      <div>
        <span class="tag" style="margin-bottom:1rem; display:inline-block;">${isDirect ? 'Direct Purchase' : 'Rare / Investment-Grade'}</span>
        <h1 style="font-size:clamp(1.7rem,3vw,2.3rem); margin-bottom:0.6rem;">${f['Name'] || ''}</h1>
        <table class="spec-table">${specHTML}</table>
        ${actionHTML}
        <hr class="hairline" style="margin: 2rem 0 1.2rem;">
        <p style="font-size:0.84rem; color:var(--espresso-faint);">Backed by three generations of trading expertise, since 1971. Member, Jaipur Jewellers Association.</p>
      </div>
    </div>`;
}
