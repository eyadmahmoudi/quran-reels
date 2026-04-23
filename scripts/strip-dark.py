"""One-off: strip all Tailwind `dark:` classes from .tsx/.ts/.css files.

Matches `dark:<anything-until-whitespace-or-quote>` with any leading whitespace
so the removal leaves clean spacing. Also collapses any resulting double spaces
inside className strings. Skips build artifacts.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTS = ('.tsx', '.ts', '.css')
SKIP = {'node_modules', '.next', '.git', '.claude', 'scripts'}

# Match `dark:<non-whitespace-class-body>` PLUS any single preceding space.
# Crucially: use ` ?` (at most one space), NOT `\s*`, so indentation and
# newlines are never consumed.
pattern = re.compile(r" ?dark:[^\s\"'`]+")

changed = []

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP]
    for name in filenames:
        if not name.endswith(EXTS):
            continue
        path = os.path.join(dirpath, name)
        with open(path, 'r', encoding='utf-8', newline='') as fh:
            src = fh.read()
        new = pattern.sub('', src)
        if new != src:
            with open(path, 'w', encoding='utf-8', newline='') as fh:
                fh.write(new)
            changed.append(os.path.relpath(path, ROOT))

print(f'Modified {len(changed)} files')
for p in changed:
    print(f'  - {p}')
