// ============================================
// Rukmani Exports — Airtable-Powered Inventory
// ============================================
// Fill in these three values once you've created your Airtable base
// (see the setup guide provided alongside this file).
const AIRTABLE_BASE_ID   = 'YOUR_BASE_ID_HERE';       // e.g. 'appXXXXXXXXXXXXXX'
const AIRTABLE_TABLE     = 'Gemstones';
const AIRTABLE_TOKEN     = 'YOUR_READ_ONLY_TOKEN_HERE'; // Personal Access Token — READ ONLY, scoped to this base only

const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;

function gemFacetSVG(colorMain, colorLight) {
  return `<svg viewBox="0 0 200 180" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block; max-width:140px; max-height:140px;"><polygon points="100,10 170,55 170,125 100,170 30,125 30,55" fill="${colorMain}"/><polygon points="100,45 140,68 140,112 100,135 60,112 60,68" fill="${colorLight}"/></svg>`;
}

// Airtable doesn't always reliably tag a file's MIME type, especially for
// videos recorded on phones — so we also check the filename extension as a backup.
function isVideoFile(item) {
  if ((item.type || '').startsWith('video/')) return true;
  const name = (item.filename || item.url || '').toLowerCase();
  return /\.(mp4|mov|webm|avi|mkv|m4v|3gp)(\?.*)?$/.test(name);
}

// Renders one inventory card. Falls back to a simple faceted illustration if no photo is set yet.
function renderStoneCard(record) {
  const f = record.fields;
  const media = f['Media'] || f['Image'] || [];
  const firstImage = media.find(m => !isVideoFile(m));
  const figure = firstImage
    ? `<div class="f-gem-figure" style="background-image:url('${firstImage.url}'); background-size:cover; background-position:center;"></div>`
    : `<div class="f-gem-figure">${gemFacetSVG('#8A1D28', '#C24550')}</div>`;

  return `
    <a href="product.html?id=${record.id}" class="f-gem-card" style="text-align:left; align-items:flex-start;">
      ${figure}
      <h4 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${f['Name'] || 'Untitled Stone'}</h4>
      <div class="f-meta">${[f['Origin'], f['Treatment'], f['Certification Lab'] ? f['Certification Lab'] + ' Certified' : ''].filter(Boolean).join(' · ')}</div>
      <span class="f-line-link">View &amp; Inquire →</span>
    </a>`;
}

// Homepage featured-products carousel. This intentionally uses the homepage's
// compact card classes rather than the larger catalog grid card layout.
function renderFeaturedStoneCard(record) {
  const f = record.fields;
  const media = f['Media'] || f['Image'] || [];
  const firstImage = media.find(m => !isVideoFile(m));
  const figure = firstImage
    ? `<div class="f-product-figure" style="background-image:url('${firstImage.url}'); background-size:cover; background-position:center;"></div>`
    : `<div class="f-product-figure" style="background:linear-gradient(160deg,#EFE6D3,#DCC9A6);">${gemFacetSVG('#8A1D28', '#C24550')}</div>`;
  return `<a href="product.html?id=${record.id}" class="f-product-card" style="text-decoration:none;">${figure}<h4>${f['Name'] || 'Untitled Stone'}</h4></a>`;
}

// Fetches and renders all Active stones for a given category into a container element.
// Homepage widget — shows a handful of Active stones across any category,
// each card linking straight to its own product page.
async function loadFeatured(containerSelector, limit = 3) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (AIRTABLE_BASE_ID.includes('YOUR_BASE_ID')) {
    container.innerHTML = `<p style="padding:2.5rem; font-size:0.9rem; color:var(--espresso-faint);">Inventory isn't connected yet — see the setup guide to go live.</p>`;
    return;
  }

  try {
    const formula = encodeURIComponent(`{Status}='Active'`);
    const res = await fetch(`${AIRTABLE_URL}?filterByFormula=${formula}&maxRecords=${limit}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    if (!res.ok) throw new Error('Airtable responded with ' + res.status);
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      container.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">New stones are being added soon — <a href="catalog.html">browse our full specialization</a> in the meantime.</p>`;
      return;
    }
    container.innerHTML = data.records.map(renderFeaturedStoneCard).join('');
  } catch (err) {
    console.error('Featured inventory load failed:', err);
    container.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);"><a href="catalog.html">Browse our gemstones →</a></p>`;
  }
}

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

function renderGalleryMainItem(item, i) {
  const isVideo = isVideoFile(item);
  return isVideo
    ? `<video src="${item.url}" controls playsinline class="gallery-main-media" data-index="${i}"></video>`
    : `<img src="${item.url}" alt="" class="gallery-main-media" data-index="${i}">`;
}

function renderMediaGallery(media) {
  if (!media || media.length === 0) {
    return `<div class="gallery-main-wrap" style="height:280px;">${gemFacetSVG('#8A1D28', '#C24550')}</div>`;
  }

  const thumbsHTML = media.map((item, i) => {
    const isVideo = isVideoFile(item);
    const realThumb = isVideo && item.thumbnails && item.thumbnails.large ? item.thumbnails.large.url : null;
    const showImg = !isVideo || realThumb;
    return `
      <button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="switchGalleryMedia(${i})" aria-label="View media ${i + 1}">
        ${showImg ? `<img src="${realThumb || item.url}" alt="" loading="lazy">` : `<div class="thumb-video-placeholder"></div>`}
        ${isVideo ? `<span class="thumb-play">▶</span>` : ''}
      </button>`;
  }).join('');

  window.__galleryMedia = media;
  window.__galleryIndex = 0;

  return `
    <div class="gallery-main-wrap">
      <div class="gallery-main-stage">${renderGalleryMainItem(media[0], 0)}</div>
      ${media.length > 1 ? `<button type="button" class="gallery-control gallery-control-prev" onclick="stepGalleryMedia(-1)" aria-label="Previous media">←</button><button type="button" class="gallery-control gallery-control-next" onclick="stepGalleryMedia(1)" aria-label="Next media">→</button>` : ''}
    </div>
    ${media.length > 1 ? `<div class="gallery-thumbs">${thumbsHTML}</div>` : ''}
  `;
}

function switchGalleryMedia(i) {
  const media = window.__galleryMedia || [];
  if (!media[i]) return;
  window.__galleryIndex = i;
  const stage = document.querySelector('.gallery-main-stage');
  if (stage) stage.innerHTML = renderGalleryMainItem(media[i], i);
  document.querySelectorAll('.gallery-thumb').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === i);
  });
  document.querySelector(`.gallery-thumb[data-index="${i}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

function stepGalleryMedia(direction) {
  const media = window.__galleryMedia || [];
  if (media.length < 2) return;
  const next = (window.__galleryIndex + direction + media.length) % media.length;
  switchGalleryMedia(next);
}

function renderProductDetail(record, container) {
  const f = record.fields;
  const galleryHTML = renderMediaGallery(f['Media'] || f['Image']);

  const specRows = [
    ['Origin', f['Origin']],
    ['Weight', f['Carat'] ? f['Carat'] + ' carats' : ''],
    ['Cut', f['Cut']],
    ['Treatment', f['Treatment']],
    ['Certification', [f['Certification Lab'], f['Certificate Number'] ? '— Certificate #' + f['Certificate Number'] : ''].filter(Boolean).join(' ')],
    ['Color', f['Color']],
  ].filter(row => row[1]);

  const specHTML = specRows.map(([label, val]) => `<tr><td>${label}</td><td>${val}</td></tr>`).join('');
  const stoneName = (f['Name'] || '').replace(/'/g, "\\'");

  const actionHTML = `
    <button class="f-btn" onclick="openInquireModal('${stoneName}')">Inquire About the Price</button>
    <p style="font-size:0.9rem; color:var(--f-grey); max-width:44ch; margin-top:1rem;">We respond to every inquiry personally — usually within one business day.</p>
  `;

  const assuranceHTML = `
    <section class="product-assurances" aria-label="Rukmani Exports assurances">
      <div class="product-assurance">
        <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17"/><path d="M7 24h34M24 7c5 5 7 10 7 17s-2 12-7 17c-5-5-7-10-7-17s2-12 7-17Z"/></svg>
        <strong>Worldwide</strong><span>Trusted by collectors across the globe.</span>
      </div>
      <div class="product-assurance">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 36h30M12 34V23h7v11M21 34V16h7v18M30 34V9h7v25"/><path d="m34 7 3 2-3 3"/></svg>
        <strong>Since 1971</strong><span>Three generations of gemstone expertise.</span>
      </div>
      <div class="product-assurance">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 20c2-4 6-6 9-6s7 2 9 6l5 8-6 5-6-6-2 2-2-2-6 6-6-5 5-8Z"/><path d="m19 23 5 5m5-5-5 5"/></svg>
        <strong>Personal Service</strong><span>Every inquiry is handled directly by our team.</span>
      </div>
      <div class="product-assurance">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 7 38 13v10c0 9-6 15-14 18-8-3-14-9-14-18V13l14-6Z"/><path d="m17 24 5 5 9-10"/></svg>
        <strong>Certified Quality</strong><span>Documentation from recognized gem laboratories.</span>
      </div>
    </section>`;

  container.innerHTML = `
    <p class="f-breadcrumb"><a href="catalog.html">Loose Gemstones</a> / ${f['Category'] || ''} / ${f['Name'] || ''}</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:3rem; align-items:flex-start;" class="f-product-split">
      <div class="f-card" style="display:flex; flex-direction:column; padding:1.5rem;">${galleryHTML}</div>
      <div>
        <h1 style="font-family:var(--f-font-display); font-weight:600; font-size:clamp(1.7rem,3vw,2.3rem); color:var(--f-espresso); margin-bottom:0.6rem;">${f['Name'] || ''}</h1>
        <table class="f-spec-table">${specHTML}</table>
        ${actionHTML}
        <hr class="f-hairline">
        <p style="font-size:0.86rem; color:var(--f-grey);">Backed by three generations of trading expertise, since 1971. Member, Jaipur Jewellers Association.</p>
      </div>
    </div>
    ${assuranceHTML}
    <style>@media (max-width:760px){ .f-product-split{ grid-template-columns:1fr !important; } }</style>`;

  // Dynamic per-product SEO: real title/description instead of a generic one for every stone
  const pageTitle = `${f['Name'] || 'Gemstone'} | Rukmani Exports`;
  document.title = pageTitle;
  const metaDesc = document.querySelector('meta[name="description"]');
  const descText = `${f['Name'] || 'This gemstone'} — ${f['Origin'] || ''}, ${f['Treatment'] || ''}, ${f['Certification Lab'] || ''} certified. From Rukmani Exports, a third-generation Jaipur gemstone house.`;
  if (metaDesc) metaDesc.setAttribute('content', descText);

  // Dynamic Product structured data for search engines
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    "name": f['Name'] || '',
    "description": descText,
    "category": f['Category'] || '',
    "brand": { "@type": "Brand", "name": "Rukmani Exports" },
    "offers": f['Price'] ? {
      "@type": "Offer",
      "priceCurrency": "USD",
      "price": f['Price'],
      "availability": "https://schema.org/InStock"
    } : undefined
  });
  document.head.appendChild(ld);
}
