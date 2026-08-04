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
    ? `<div class="stone-figure" style="background-image:url('${firstImage.url}'); background-size:cover; background-position:center;"></div>`
    : `<div class="stone-figure">${gemFacetSVG('#8A1D28', '#C24550')}</div>`;

  const priceLine = f['Price']
    ? `<div class="price">${formatPrice(f['Price'])}</div>`
    : '';

  return `
    <div class="stone-card">
      ${figure}
      <h4>${f['Name'] || 'Untitled Stone'}</h4>
      <div class="meta">${[f['Origin'], f['Treatment'], f['Certification Lab'] ? f['Certification Lab'] + ' Certified' : ''].filter(Boolean).join(' · ')}</div>
      ${priceLine}
      <a href="product.html?id=${record.id}" class="text-link">View &amp; Inquire →</a>
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
    const thumbSrc = isVideo ? (item.thumbnails && item.thumbnails.large ? item.thumbnails.large.url : item.url) : item.url;
    return `
      <button class="gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="switchGalleryMedia(${i})" aria-label="View media ${i + 1}">
        ${isVideo ? `<span class="thumb-play">▶</span>` : ''}
        <img src="${thumbSrc}" alt="">
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
    ${f['Price'] ? `<div class="price-tag">${formatPrice(f['Price'])} <span style="font-size:1rem; font-weight:400; color:var(--espresso-faint);">USD (indicative)</span></div>` : ''}
    <button class="btn btn-solid" style="border:none;" onclick="openInquireModal('${stoneName}')">Inquire About This Piece</button>
    <p style="font-size:0.86rem; color:var(--espresso-faint); max-width:44ch; margin-top:1rem;">We respond to every inquiry personally — usually within one business day.</p>
  `;

  container.innerHTML = `
    <p class="eyebrow" style="margin-bottom:1.5rem;"><a href="loose-gemstones.html" style="color:inherit;">Loose Gemstones</a> / ${f['Category'] || ''} / ${f['Name'] || ''}</p>
    <div class="split reveal in" style="align-items:flex-start;">
      <div class="product-figure" style="flex-direction:column; padding:1.5rem;">${galleryHTML}</div>
      <div>
        <h1 style="font-size:clamp(1.7rem,3vw,2.3rem); margin-bottom:0.6rem;">${f['Name'] || ''}</h1>
        <table class="spec-table">${specHTML}</table>
        ${actionHTML}
        <hr class="hairline" style="margin: 2rem 0 1.2rem;">
        <p style="font-size:0.84rem; color:var(--espresso-faint);">Backed by three generations of trading expertise, since 1971. Member, Jaipur Jewellers Association.</p>
      </div>
    </div>`;
}
