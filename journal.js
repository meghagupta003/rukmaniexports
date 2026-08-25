// ============================================
// Rukmani Exports — Journal (Blog) Widget
// ============================================
// Uses a third table in the same Airtable base as inventory and reviews.
// See AIRTABLE-SETUP-GUIDE.md, "Journal Table" section, for column setup.
const JOURNAL_TABLE = 'Journal';
const JOURNAL_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(JOURNAL_TABLE)}`;

// A small, dependency-free Markdown-to-HTML converter — covers the basics
// Airtable's rich-text long-text field actually produces: **bold**, *italic*,
// "- " bullet lists, and paragraphs separated by a blank line.
function simpleMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const blocks = html.split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.trim().split('\n');
    if (lines.every(l => l.trim().startsWith('- '))) {
      return '<ul>' + lines.map(l => `<li>${l.replace(/^- /, '')}</li>`).join('') + '</ul>';
    }
    if (block.trim().startsWith('## ')) {
      return `<h3>${block.trim().replace(/^## /, '')}</h3>`;
    }
    return `<p>${lines.join('<br>')}</p>`;
  }).join('\n');
}

function renderJournalCard(record) {
  const f = record.fields;
  const hasImage = f['Cover Image'] && f['Cover Image'].length > 0;
  return `
    <a href="article.html?id=${record.id}" class="f-journal-card">
      <div class="f-journal-img" ${hasImage ? `style="background-image:url('${f['Cover Image'][0].url}')"` : ''}></div>
      <div class="f-journal-body">
        <p class="f-eyebrow" style="margin-bottom:0.4rem;">${f['Pillar'] || 'From the Journal'}</p>
        <h4>${f['Title'] || ''}</h4>
        <p style="font-size:0.92rem; color:var(--f-grey);">${f['Excerpt'] || ''}</p>
        <span class="f-line-link" style="margin-top:0.9rem; display:inline-block;">Read →</span>
      </div>
    </a>`;
}

async function loadJournalList(containerSelector, limit = 12) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (AIRTABLE_BASE_ID.includes('YOUR_BASE_ID')) {
    container.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">Journal isn't connected yet — see the setup guide to go live.</p>`;
    return;
  }

  try {
    const formula = encodeURIComponent(`{Status}='Published'`);
    const sort = encodeURIComponent('Published Date');
    const res = await fetch(`${JOURNAL_URL}?filterByFormula=${formula}&maxRecords=${limit}&sort[0][field]=${sort}&sort[0][direction]=desc`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    if (!res.ok) throw new Error('Airtable responded with ' + res.status);
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      container.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">New stories are on the way — please check back soon.</p>`;
      return;
    }
    container.innerHTML = data.records.map(renderJournalCard).join('');
  } catch (err) {
    console.error('Journal list load failed:', err);
    container.innerHTML = `<p style="padding:2.5rem; color:var(--espresso-faint);">The Journal is temporarily unavailable. Please check back shortly.</p>`;
  }
}

async function loadArticle(recordId, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  try {
    const res = await fetch(`${JOURNAL_URL}/${recordId}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    if (!res.ok) throw new Error('Airtable responded with ' + res.status);
    const record = await res.json();
    const f = record.fields;
    const hasImage = f['Cover Image'] && f['Cover Image'].length > 0;

    container.innerHTML = `
      <p class="eyebrow" style="margin-bottom:1rem;"><a href="journal.html" style="color:inherit;">Journal</a> / ${f['Pillar'] || ''}</p>
      <h1 style="font-size:clamp(2rem,4vw,3rem); margin-bottom:1.5rem;">${f['Title'] || ''}</h1>
      ${hasImage ? `<div class="article-hero-img" style="background-image:url('${f['Cover Image'][0].url}')"></div>` : ''}
      <div class="article-body">${simpleMarkdown(f['Body'])}</div>`;

    document.title = `${f['Title'] || 'Journal'} | Rukmani Exports`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && f['Excerpt']) metaDesc.setAttribute('content', f['Excerpt']);

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": f['Title'] || '',
      "description": f['Excerpt'] || '',
      "author": { "@type": "Organization", "name": "Rukmani Exports" },
      "publisher": { "@type": "Organization", "name": "Rukmani Exports" }
    });
    document.head.appendChild(ld);
  } catch (err) {
    console.error('Article load failed:', err);
    container.innerHTML = `<p style="padding:3rem 0; color:var(--espresso-faint);">This story could not be loaded. Please return to the <a href="journal.html">Journal</a>.</p>`;
  }
}
