#!/usr/bin/env python3
"""Adiciona data-testid aos botões Copiar (data-ds-copy) em templates HTML."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "templates"

BTN_OPEN_RE = re.compile(r"<button\b[^>]*>", re.IGNORECASE)


def patch_copy_buttons(html: str) -> tuple[str, int]:
    count = 0

    def repl_button(m: re.Match) -> str:
        nonlocal count
        tag = m.group(0)
        if "data-testid=" in tag.lower():
            return tag
        if "data-ds-copy=" not in tag:
            return tag
        m2 = re.search(r'data-ds-copy="([^"]+)"', tag)
        if not m2:
            return tag
        val = m2.group(1)
        count += 1
        return tag[:-1] + f' data-testid="ds-copy-{val}">'

    return BTN_OPEN_RE.sub(repl_button, html), count


def main() -> None:
    total = 0
    for path in sorted(ROOT.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        new, n = patch_copy_buttons(text)
        if n:
            path.write_text(new, encoding="utf-8")
            print(f"{path.relative_to(ROOT)}: +{n} copy testids")
            total += n
    print(f"Total copy buttons patched: {total}")


if __name__ == "__main__":
    main()
