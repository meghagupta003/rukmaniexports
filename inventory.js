// ============================================
// Rukmani Exports — Airtable-Powered Inventory
// ============================================
// Fill in these three values once you've created your Airtable base
// (see the setup guide provided alongside this file).
const AIRTABLE_BASE_ID   = 'YOUR_BASE_ID_HERE';       // e.g. 'appXXXXXXXXXXXXXX'
const AIRTABLE_TABLE     = 'Gemstones';
const AIRTABLE_TOKEN     = 'YOUR_READ_ONLY_TOKEN_HERE'; // Personal Access Token — READ ONLY, scoped to this base only

const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;

function formatPrice(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

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

  const priceLine = f['Price']
    ? `<div class="f-price">${formatPrice(f['Price'])}</div>`
    : '';

  return `
    <a href="product.html?id=${record.id}" class="f-gem-card" style="text-align:left; align-items:flex-start;">
      ${figure}
      <h4 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${f['Name'] || 'Untitled Stone'}</h4>
      <div class="f-meta">${[f['Origin'], f['Treatment'], f['Certification Lab'] ? f['Certification Lab'] + ' Certified' : ''].filter(Boolean).join(' · ')}</div>
      ${priceLine}
      <span class="f-line-link">View &amp; Inquire →</span>
    </a>`;
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
    container.innerHTML = data.records.map(renderStoneCard).join('');
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

function renderMediaGallery(media) {
  if (!media || media.length === 0) {
    return `<div class="gallery-main-wrap" style="height:280px;">${gemFacetSVG('#8A1D28', '#C24550')}</div>`;
  }

  const mainItemHTML = (item, i) => {
    const isVideo = isVideoFile(item);
    return isVideo
      ? `<video src="${item.url}" controls playsinline id="mediaMain" data-index="${i}" style="width:100%; max-height:460px; background:#000;"></video>`
      : `<img src="${item.url}" alt="" id="mediaMain" data-index="${i}" style="width:100%; max-height:460px; object-fit:contain;">`;
  };

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

  window.__galleryMedia = media; // stashed for switchGalleryMedia to read

  return `
    <div class="gallery-main-wrap">${mainItemHTML(media[0], 0)}</div>
    ${media.length > 1 ? `<div class="gallery-thumbs">${thumbsHTML}</div>` : ''}
  `;
}

function switchGalleryMedia(i) {
  const media = window.__galleryMedia || [];
  const item = media[i];
  if (!item) return;
  const wrap = document.querySelector('.gallery-main-wrap');
  const isVideo = isVideoFile(item);
  wrap.innerHTML = isVideo
    ? `<video src="${item.url}" controls playsinline autoplay style="width:100%; max-height:460px; background:#000;"></video>`
    : `<img src="${item.url}" alt="" style="width:100%; max-height:460px; object-fit:contain;">`;
  document.querySelectorAll('.gallery-thumb').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === i);
  });
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
    ${f['Price'] ? `<div style="font-family:var(--f-font-display); font-size:2rem; font-weight:600; color:var(--f-espresso); margin:0.4rem 0 1.5rem;">${formatPrice(f['Price'])} <span style="font-size:1rem; font-weight:400; color:var(--f-grey);">USD (indicative)</span></div>` : ''}
    <button class="f-btn" onclick="openInquireModal('${stoneName}')">Inquire About This Piece</button>
    <p style="font-size:0.9rem; color:var(--f-grey); max-width:44ch; margin-top:1rem;">We respond to every inquiry personally — usually within one business day.</p>
  `;

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
