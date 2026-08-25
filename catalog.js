// ============================================
// Rukmani Exports — Full Gemstone Catalog Engine
// ============================================
// Fetches every Active stone once, then handles category selection,
// search, sort, filtering, and pagination entirely in the browser —
// no repeated Airtable calls as the person browses.

const PAGE_SIZE = 28;

let CATALOG_ALL = [];       // every Active record, fetched once
let CATALOG_FILTERED = [];  // after category + search + filters + sort
let CATALOG_SHOWN = 0;      // how many of CATALOG_FILTERED are on screen
let CATALOG_STATE = {
  category: 'All',
  search: '',
  sort: 'recent',
  origins: new Set(),
  colors: new Set(),
  caratMin: null,
  caratMax: null,
};

function gemFallbackFigure() {
  return `<div class="cat-card-figure" style="background:linear-gradient(135deg,#F3E4D0,#E6D2B4); display:flex; align-items:center; justify-content:center;">${gemFacetSVG('#8A1D28', '#C24550')}</div>`;
}

// ---------- Initial fetch ----------
async function initCatalog() {
  const grid = document.getElementById('cat-grid');

  if (AIRTABLE_BASE_ID.includes('YOUR_BASE_ID')) {
    grid.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">Inventory isn't connected yet — see the setup guide to go live.</p>`;
    return;
  }

  grid.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">Loading catalog…</p>`;

  try {
    let records = [];
    let offset = null;
    do {
      const formula = encodeURIComponent(`{Status}='Active'`);
      const url = `${AIRTABLE_URL}?filterByFormula=${formula}&pageSize=100${offset ? `&offset=${offset}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
      if (!res.ok) throw new Error('Airtable responded with ' + res.status);
      const data = await res.json();
      records = records.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    CATALOG_ALL = records;

    // Pick up an optional ?category= from the URL (e.g. linked from the homepage)
    const params = new URLSearchParams(window.location.search);
    const urlCategory = params.get('category');
    if (urlCategory) {
      // Links use the customer-facing singular (for example, ?category=Ruby),
      // while the inventory may store "Ruby" or "Rubies". Resolve it against
      // the actual Airtable values before rendering the selected category.
      const categories = [...new Set(records.map(r => r.fields['Category']).filter(Boolean))];
      const normalized = urlCategory.trim().toLowerCase();
      const singular = normalized.replace(/ies$/, 'y').replace(/s$/, '');
      CATALOG_STATE.category = categories.find(category => {
        const candidate = category.toLowerCase();
        return candidate === normalized || candidate.replace(/ies$/, 'y').replace(/s$/, '') === singular;
      }) || urlCategory;
    }

    buildSidebar();
    buildFilterDrawerOptions();
    applyCatalogState();
  } catch (err) {
    console.error('Catalog load failed:', err);
    grid.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">The catalog is temporarily unavailable. Please check back shortly.</p>`;
  }
}

// ---------- Sidebar (dynamic categories + live counts) ----------
function buildSidebar() {
  const counts = {};
  CATALOG_ALL.forEach(r => {
    const cat = r.fields['Category'] || 'Uncategorized';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  const categories = Object.keys(counts).sort();

  const rows = [`<button class="cat-sidebar-item ${CATALOG_STATE.category === 'All' ? 'active' : ''}" data-cat="All">All <span>${CATALOG_ALL.length}</span></button>`];
  categories.forEach(cat => {
    rows.push(`<button class="cat-sidebar-item ${CATALOG_STATE.category === cat ? 'active' : ''}" data-cat="${cat}">${cat} <span>${counts[cat]}</span></button>`);
  });
  const html = rows.join('');

  // Populate both the desktop sidebar and the separate mobile overlay list —
  // two containers, since they live in different parts of the DOM for layout reasons.
  const desktopList = document.getElementById('cat-sidebar-list');
  const mobileList = document.getElementById('cat-sidebar-list-mobile');
  if (desktopList) desktopList.innerHTML = html;
  if (mobileList) mobileList.innerHTML = html;

  document.querySelectorAll('#cat-sidebar-list .cat-sidebar-item, #cat-sidebar-list-mobile .cat-sidebar-item').forEach(btn => {
    btn.addEventListener('click', () => {
      CATALOG_STATE.category = btn.dataset.cat;
      // Keep the active state in sync across both lists, not just the one clicked
      document.querySelectorAll('#cat-sidebar-list .cat-sidebar-item, #cat-sidebar-list-mobile .cat-sidebar-item').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === btn.dataset.cat);
      });
      document.getElementById('cat-current-title').textContent = btn.dataset.cat === 'All' ? 'All Gemstones' : btn.dataset.cat;
      applyCatalogState();
      document.getElementById('cat-mobile-sidebar')?.classList.remove('open');
      window.scrollTo({ top: document.getElementById('cat-toolbar').offsetTop - 100, behavior: 'smooth' });
    });
  });
}

// ---------- Filter drawer (dynamic Origin / Color options + real Carat range) ----------
function buildFilterDrawerOptions() {
  const origins = [...new Set(CATALOG_ALL.map(r => r.fields['Origin']).filter(Boolean))].sort();
  const colors = [...new Set(CATALOG_ALL.map(r => r.fields['Color']).filter(Boolean))].sort();
  const carats = CATALOG_ALL.map(r => Number(r.fields['Carat'])).filter(n => !isNaN(n));
  const minCarat = carats.length ? Math.floor(Math.min(...carats) * 10) / 10 : 0;
  const maxCarat = carats.length ? Math.ceil(Math.max(...carats) * 10) / 10 : 10;

  document.getElementById('filter-origin-list').innerHTML = origins.map(o =>
    `<label class="filter-check"><input type="checkbox" value="${o}" data-group="origin"> ${o}</label>`
  ).join('') || '<p class="filter-empty">No data yet</p>';

  document.getElementById('filter-color-list').innerHTML = colors.map(c =>
    `<label class="filter-check"><input type="checkbox" value="${c}" data-group="color"> ${c}</label>`
  ).join('') || '<p class="filter-empty">No data yet</p>';

  const caratMinInput = document.getElementById('filter-carat-min');
  const caratMaxInput = document.getElementById('filter-carat-max');
  caratMinInput.min = minCarat; caratMinInput.max = maxCarat; caratMinInput.value = minCarat; caratMinInput.placeholder = minCarat;
  caratMaxInput.min = minCarat; caratMaxInput.max = maxCarat; caratMaxInput.value = maxCarat; caratMaxInput.placeholder = maxCarat;
}

function openFilterDrawer() {
  document.getElementById('filter-drawer').classList.add('open');
  document.getElementById('filter-overlay-bg').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeFilterDrawer() {
  document.getElementById('filter-drawer').classList.remove('open');
  document.getElementById('filter-overlay-bg').classList.remove('open');
  document.body.style.overflow = '';
}

function applyFilterDrawer() {
  CATALOG_STATE.origins = new Set([...document.querySelectorAll('[data-group="origin"]:checked')].map(el => el.value));
  CATALOG_STATE.colors = new Set([...document.querySelectorAll('[data-group="color"]:checked')].map(el => el.value));
  const minVal = parseFloat(document.getElementById('filter-carat-min').value);
  const maxVal = parseFloat(document.getElementById('filter-carat-max').value);
  CATALOG_STATE.caratMin = isNaN(minVal) ? null : minVal;
  CATALOG_STATE.caratMax = isNaN(maxVal) ? null : maxVal;
  updateFilterCountBadge();
  applyCatalogState();
  closeFilterDrawer();
}

function clearFilterDrawer() {
  document.querySelectorAll('#filter-drawer input[type="checkbox"]').forEach(el => el.checked = false);
  buildFilterDrawerOptions();
  CATALOG_STATE.origins = new Set();
  CATALOG_STATE.colors = new Set();
  CATALOG_STATE.caratMin = null;
  CATALOG_STATE.caratMax = null;
  updateFilterCountBadge();
  applyCatalogState();
}

function updateFilterCountBadge() {
  const n = CATALOG_STATE.origins.size + CATALOG_STATE.colors.size + (CATALOG_STATE.caratMin !== null ? 1 : 0) + (CATALOG_STATE.caratMax !== null ? 1 : 0);
  const badge = document.getElementById('filter-count-badge');
  badge.textContent = n > 0 ? n : '';
  badge.style.display = n > 0 ? 'inline-flex' : 'none';
}

// ---------- Search & sort ----------
function wireToolbar() {
  document.getElementById('cat-search').addEventListener('input', (e) => {
    CATALOG_STATE.search = e.target.value.trim().toLowerCase();
    applyCatalogState();
  });
  document.getElementById('cat-sort').addEventListener('change', (e) => {
    CATALOG_STATE.sort = e.target.value;
    applyCatalogState();
  });
  document.getElementById('cat-filter-btn').addEventListener('click', openFilterDrawer);
  document.getElementById('filter-drawer-close').addEventListener('click', closeFilterDrawer);
  document.getElementById('filter-overlay-bg').addEventListener('click', closeFilterDrawer);
  document.getElementById('filter-apply-btn').addEventListener('click', applyFilterDrawer);
  document.getElementById('filter-clear-btn').addEventListener('click', clearFilterDrawer);
  document.getElementById('cat-load-more').addEventListener('click', renderNextPage);
  document.getElementById('cat-mobile-filter-toggle')?.addEventListener('click', () => {
    document.getElementById('cat-mobile-sidebar').classList.add('open');
  });
  document.getElementById('cat-mobile-sidebar-close')?.addEventListener('click', () => {
    document.getElementById('cat-mobile-sidebar').classList.remove('open');
  });
  document.getElementById('cat-mobile-sidebar')?.addEventListener('click', (e) => {
    if (e.target.id === 'cat-mobile-sidebar') e.currentTarget.classList.remove('open');
  });
}

// ---------- Core filtering pipeline ----------
function applyCatalogState() {
  let items = CATALOG_ALL;

  if (CATALOG_STATE.category !== 'All') {
    items = items.filter(r => (r.fields['Category'] || '') === CATALOG_STATE.category);
  }
  if (CATALOG_STATE.search) {
    const q = CATALOG_STATE.search;
    items = items.filter(r => {
      const f = r.fields;
      return [f['Name'], f['Origin'], f['Category'], f['Color']].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }
  if (CATALOG_STATE.origins.size) {
    items = items.filter(r => CATALOG_STATE.origins.has(r.fields['Origin']));
  }
  if (CATALOG_STATE.colors.size) {
    items = items.filter(r => CATALOG_STATE.colors.has(r.fields['Color']));
  }
  if (CATALOG_STATE.caratMin !== null) {
    items = items.filter(r => Number(r.fields['Carat']) >= CATALOG_STATE.caratMin);
  }
  if (CATALOG_STATE.caratMax !== null) {
    items = items.filter(r => Number(r.fields['Carat']) <= CATALOG_STATE.caratMax);
  }

  if (CATALOG_STATE.sort === 'price-asc') {
    items = [...items].sort((a, b) => (Number(a.fields['Price']) || 0) - (Number(b.fields['Price']) || 0));
  } else if (CATALOG_STATE.sort === 'price-desc') {
    items = [...items].sort((a, b) => (Number(b.fields['Price']) || 0) - (Number(a.fields['Price']) || 0));
  } else if (CATALOG_STATE.sort === 'carat-desc') {
    items = [...items].sort((a, b) => (Number(b.fields['Carat']) || 0) - (Number(a.fields['Carat']) || 0));
  }
  // 'recent' = leave in natural (Airtable) order

  CATALOG_FILTERED = items;
  CATALOG_SHOWN = 0;
  document.getElementById('cat-grid').innerHTML = '';
  renderNextPage();
}

// ---------- Rendering + pagination ----------
function renderCatalogCard(record) {
  const f = record.fields;
  const media = f['Media'] || f['Image'] || [];
  const firstImage = media.find(m => !isVideoFile(m));
  const figure = firstImage
    ? `<div class="cat-card-figure" style="background-image:url('${firstImage.url}'); background-size:cover; background-position:center;"></div>`
    : gemFallbackFigure();

  return `
    <a href="product.html?id=${record.id}" class="cat-card">
      ${figure}
      <h4>${f['Name'] || 'Untitled Stone'}</h4>
      ${f['Price'] ? `<p class="cat-card-price">${formatPrice(f['Price'])}</p>` : `<p class="cat-card-price cat-card-inquire">Inquire</p>`}
    </a>`;
}

function renderNextPage() {
  const grid = document.getElementById('cat-grid');
  const nextBatch = CATALOG_FILTERED.slice(CATALOG_SHOWN, CATALOG_SHOWN + PAGE_SIZE);

  if (CATALOG_SHOWN === 0 && nextBatch.length === 0) {
    grid.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">No stones match these filters — try widening your search.</p>`;
  } else {
    grid.insertAdjacentHTML('beforeend', nextBatch.map(renderCatalogCard).join(''));
  }

  CATALOG_SHOWN += nextBatch.length;

  document.getElementById('cat-viewed-count').textContent =
    `Viewed ${CATALOG_SHOWN} of ${CATALOG_FILTERED.length}`;
  document.getElementById('cat-load-more').style.display =
    CATALOG_SHOWN >= CATALOG_FILTERED.length ? 'none' : 'inline-flex';
}

document.addEventListener('DOMContentLoaded', () => {
  wireToolbar();
  initCatalog();
});
