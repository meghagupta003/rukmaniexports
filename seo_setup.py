#!/usr/bin/env python3
"""
Rukmani Exports: SEO setup.

For every page in your repo it:
  - INDEX pages:    adds <meta name="robots" content="index, follow"> and a canonical link
  - NOINDEX pages:  adds <meta name="robots" content="noindex, nofollow">
  - SKIP pages:     leaves untouched (dynamic template pages)
It also writes robots.txt and sitemap.xml in the repo root.

Safe to re-run. Existing robots/canonical tags on a page are replaced, not duplicated.

Usage (from the repo root):
    python3 seo_setup.py            # preview only, changes nothing
    python3 seo_setup.py --apply    # writes the changes
"""
import os
import re
import sys

APPLY = '--apply' in sys.argv
BASE = 'https://www.rukmaniexport.com'

# Pages search engines should find. Order = sitemap order.
INDEX_PAGES = [
    'index.html',
    'loose-gemstones.html',
    'catalog.html',
    'rubies.html',
    'basra-pearls.html',
    'sapphires.html',
    'emeralds.html',
    'cats-eye.html',
    'alexandrite.html',
    'fine-jewellery.html',
    'heritage.html',
    'trade.html',
    'certification.html',
    'journal.html',
    'contact.html',
    'privacy.html',
    'returns.html',
    'shipping.html',
]

# Pages that should stay out of search results.
NOINDEX_PAGES = [
    'concept-a-museum-catalog.html',
    'concept-b-atelier-portfolio.html',
    'concept-c-quiet-boutique.html',
    'index-figma-v1.html',
    'cart.html',
    'next-steps.html',
]

# Dynamic template pages (content loads from Airtable). Not touched.
SKIP_PAGES = [
    'article.html',
    'product.html',
    'product-ruby.html',
    'product-accessible.html',
]

ROBOTS_RE = re.compile(r'[ \t]*<meta\s+name=["\']robots["\'][^>]*>\s*\n?', re.I)
CANON_RE = re.compile(r'[ \t]*<link\s+rel=["\']canonical["\'][^>]*>\s*\n?', re.I)


def page_url(name):
    return BASE + '/' if name == 'index.html' else f'{BASE}/{name}'


def update_page(name, mode):
    if not os.path.exists(name):
        return 'missing'
    with open(name, encoding='utf-8') as f:
        html = f.read()

    html = ROBOTS_RE.sub('', html)
    html = CANON_RE.sub('', html)

    if mode == 'index':
        block = (f'  <meta name="robots" content="index, follow">\n'
                 f'  <link rel="canonical" href="{page_url(name)}">\n')
    else:
        block = '  <meta name="robots" content="noindex, nofollow">\n'

    new_html, n = re.subn(r'</head>', block + '</head>', html, count=1, flags=re.I)
    if n == 0:
        return 'no-head'
    if APPLY:
        with open(name, 'w', encoding='utf-8') as f:
            f.write(new_html)
    return 'ok'


def build_robots():
    return f'User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n'


def build_sitemap():
    rows = ''.join(f'  <url><loc>{page_url(p)}</loc></url>\n' for p in INDEX_PAGES
                   if os.path.exists(p))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + rows + '</urlset>\n')


def show_existing(path):
    if os.path.exists(path):
        print(f'\n--- Current {path} (will be replaced) ---')
        with open(path, encoding='utf-8') as f:
            print(f.read().rstrip())
        print('--- end ---')


print(('APPLYING' if APPLY else 'PREVIEW') + ' (domain: ' + BASE + ')\n')

for label, pages, mode in (('INDEX', INDEX_PAGES, 'index'),
                           ('NOINDEX', NOINDEX_PAGES, 'noindex')):
    print(f'{label} pages:')
    for p in pages:
        print(f'   {p:36s} {update_page(p, mode)}')
    print()

print('Left untouched (dynamic pages):')
for p in SKIP_PAGES:
    print('  ', p)

known = set(INDEX_PAGES + NOINDEX_PAGES + SKIP_PAGES)
others = sorted(f for f in os.listdir('.') if f.endswith('.html') and f not in known)
if others:
    print('\nHTML files not on any list (check these by hand):')
    for f in others:
        print('  ', f)

show_existing('robots.txt')
show_existing('sitemap.xml')

if APPLY:
    with open('robots.txt', 'w', encoding='utf-8') as f:
        f.write(build_robots())
    with open('sitemap.xml', 'w', encoding='utf-8') as f:
        f.write(build_sitemap())
    print('\nWrote robots.txt and sitemap.xml')
else:
    print('\nPreview only. Run again with --apply to write changes.')
