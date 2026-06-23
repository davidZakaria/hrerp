#!/usr/bin/env python3
"""Fix UTF-8 mojibake in AdminDashboard.js using explicit codepoint mappings."""
from pathlib import Path

FILE = Path(__file__).resolve().parents[1] / 'src' / 'components' / 'AdminDashboard.js'

# Mojibake sequences (UTF-8 emoji mis-decoded) -> correct emoji
REPLACEMENTS = [
    ('\u00f0\u0178\u201c\u0160', '\U0001f4ca'),  # chart
    ('\u00f0\u0178\u2018\u00a5', '\U0001f465'),  # busts
    ('\u00f0\u0178\u201c\u2039', '\U0001f4cb'),  # clipboard
    ('\u00f0\u0178\u017d\u00af', '\U0001f3af'),  # target
    ('\u00f0\u0178\u201c\u02dc', '\U0001f4c8'),  # chart increasing
    ('\u00f0\u0178\u2018\u0094', '\U0001f454'),  # necktie
    ('\u00f0\u0178\u2018\u00a4', '\U0001f464'),  # bust
    ('\u00f0\u0178\u008f\u2013\u00ef\u00b8\u008f', '\U0001f3d6\ufe0f'),  # beach
    ('\u00f0\u0178\u008f\u00a5', '\U0001f3e5'),  # hospital
    ('\u00f0\u0178\u0095\u0090', '\U0001f550'),  # clock
    ('\u00f0\u0178\u008f\u00a0', '\U0001f3e0'),  # house
    ('\u00f0\u0178\u201c\u009d', '\U0001f4dd'),  # memo
    ('\u00f0\u0178\u201c\u0084', '\U0001f4c4'),  # page
    ('\u00f0\u0178\u201d\u2018', '\U0001f511'),  # key
    ('\u00f0\u0178\u2014\u2018\u00ef\u00b8\u008f', '\U0001f5d1\ufe0f'),  # wastebasket
    ('\u00f0\u0178\u009a\u00a9', '\U0001f6a9'),  # flag
    ('\u00f0\u0178\u2019\u00b0', '\U0001f4b0'),  # money
    ('\u00f0\u0178\u201d\u008d', '\U0001f50d'),  # magnifier
    ('\u00f0\u0178\u2019\u00be', '\U0001f4be'),  # floppy
    ('\u00f0\u0178\u2013\u00a8\u00ef\u00b8\u008f', '\U0001f5a8\ufe0f'),  # printer
    ('\u00f0\u0178\u2018\u00a8\u200d\u00f0\u0178\u2019\u00bc', '\U0001f468\u200d\U0001f4bc'),  # office worker
    ('\u00e2\u0153\u2026', '\u2705'),  # check
    ('\u00e2\u0153\u0085', '\u2705'),
    ('\u00e2\u274c', '\u274c'),  # cross - might be wrong
    ('\u00e2\u009d\u0152', '\u274c'),  # cross mark
    ('\u00e2\u0161\u00a0\u00ef\u00b8\u008f', '\u26a0\ufe0f'),  # warning
    ('\u00e2\u008f\u00b1\u00ef\u00b8\u008f', '\u23f1\ufe0f'),  # stopwatch
    ('\u00e2\u0153\u02dc\u00ef\u00b8\u008f', '\u2708\ufe0f'),  # airplane
    ('\u00f0\u0178\u0095\u0090', '\U0001f550'),  # clock excuse
    ('\u00f0\u0178\u0095\u0090', '\U0001f550'),
    ('\u00f0\u0178\u2018\u00a8\u200d\u00f0\u0178\u2019\u00bc', '\U0001f468\u200d\U0001f4bc'),
    ('\u00f0\u0178\u2018\u00a8\u00e2\u0080\u008d\u00f0\u0178\u2019\u00bc', '\U0001f468\u200d\U0001f4bc'),
    ('\u00e2\u008f\u00b3', '\u23f3'),  # hourglass
    ('\u00e2\u0153\u008f\u00ef\u00b8\u008f', '\u270f\ufe0f'),  # pencil
    ('\u00e2\u0153\u2022', '\u2022'),  # bullet
    ('\u00e2\u20ac\u00a2', '\u2022'),  # bullet alt
    ('\u00e2\u0153\u2020', '\u2715'),  # close - approximate
    ('\u00e2\u0153\u2021', '\u2715'),
    ('\u00e2\u2b50', '\u2b50'),  # star - may exist correctly already
    ('\u00e2\u008f\u00b1', '\u23f1\ufe0f'),
]

IMPORT_LINE = "import { NAV, ROLE, FORM, ACTION, MISC, formTypeIcon } from '../utils/dashboardEmojis';"


def try_cp1252_roundtrip(text: str) -> str:
    """Fix any substring that is valid cp1252 round-trip to utf-8."""
    result = []
    i = 0
    while i < len(text):
        if ord(text[i]) >= 0x80:
            j = i
            while j < len(text) and ord(text[j]) >= 0x80:
                j += 1
            chunk = text[i:j]
            fixed = chunk
            for enc in ('cp1252', 'latin-1'):
                try:
                    fixed = chunk.encode(enc).decode('utf-8')
                    break
                except (UnicodeDecodeError, UnicodeEncodeError, ValueError):
                    continue
            result.append(fixed)
            i = j
        else:
            result.append(text[i])
            i += 1
    return ''.join(result)


def main():
    content = FILE.read_text(encoding='utf-8')

    for broken, fixed in REPLACEMENTS:
        content = content.replace(broken, fixed)

    content = try_cp1252_roundtrip(content)

    if IMPORT_LINE not in content:
        content = content.replace(
            "import logger from '../utils/logger';",
            "import logger from '../utils/logger';\n" + IMPORT_LINE,
        )

    nav_map = [
        ("icon: '\U0001f4ca'", 'icon: NAV.overview'),
        ("icon: '\U0001f465'", 'icon: NAV.users'),
        ("icon: '\U0001f4cb'", 'icon: NAV.forms'),
        ("icon: '\U0001f3af'", 'icon: NAV.ats'),
        ("icon: '\U0001f4c8'", 'icon: NAV.attendance'),
    ]
    for old, new in nav_map:
        content = content.replace(old, new)

    FILE.write_text(content, encoding='utf-8', newline='\n')

    bad = sum(1 for line in content.splitlines() if '\u00f0' in line or '\u00e2\u0153' in line or '\u00e2\u0080' in line)
    print(f'Wrote {FILE.name}, suspicious lines remaining: {bad}')


if __name__ == '__main__':
    main()
