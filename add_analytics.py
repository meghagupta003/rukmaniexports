#!/usr/bin/env python3
"""
Adds <script src="analytics.js" defer></script> to the <head> of every .html
file in the project. Safe to re-run: pages that already have it are skipped.

Usage (from the root of your site repo, next to analytics.js):
    python3 add_analytics.py            # preview only, changes nothing
    python3 add_analytics.py --apply    # writes the changes
"""
import os
import re
import sys

APPLY = '--apply' in sys.argv
SKIP_DIRS = {'.git', 'node_modules', '.github'}
MARKER = 'analytics.js'

changed, skipped, problems = [], [], []

for folder, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for name in files:
        if not name.endswith('.html'):
            continue
        path = os.path.join(folder, name)
        with open(path, encoding='utf-8') as f:
            html = f.read()

        if MARKER in html:
            skipped.append(path)
            continue

        # relative path back to the root, so pages in subfolders still work
        depth = os.path.normpath(folder).count(os.sep) + (0 if folder == '.' else 1)
        prefix = '../' * depth
        tag = f'  <script src="{prefix}analytics.js" defer></script>\n'

        new_html, n = re.subn(r'</head>', tag + '</head>', html, count=1, flags=re.I)
        if n == 0:
            problems.append(path)
            continue

        changed.append(path)
        if APPLY:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_html)

print(('UPDATED' if APPLY else 'WOULD UPDATE') + f' ({len(changed)}):')
for p in changed:
    print('  ', p)
print(f'\nAlready had it ({len(skipped)}):')
for p in skipped:
    print('  ', p)
if problems:
    print(f'\nNo </head> found, check by hand ({len(problems)}):')
    for p in problems:
        print('  ', p)
if not APPLY:
    print('\nPreview only. Run again with --apply to write changes.')
