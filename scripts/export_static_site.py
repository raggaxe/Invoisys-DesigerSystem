#!/usr/bin/env python3
"""
Gera site estático em site/ para GitHub Pages (HTML com includes resolvidos).

- url_for('static', filename=...) -> caminhos relativos static/... (compatível com
  https://usuario.github.io/nome-do-repo/)
- url_for('repo_download', name=...) -> ficheiro na raiz do site/ (cópia a partir da raiz do repo)

Uso: na raiz do repositório, após pip install -r requirements.txt:
  python scripts/export_static_site.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
SITE_DIR = BASE_DIR / "site"

_REPO_DOWNLOAD_ALLOW = frozenset({"requirements.txt", "app.py", ".gitignore"})


def build_url_for() -> callable:
    """Replica o mínimo de Flask.url_for usado nos templates."""

    def url_for(endpoint: str, **values: str) -> str:
        if endpoint == "static":
            filename = (values.get("filename") or "").replace("\\", "/").lstrip("/")
            return f"static/{filename}"
        if endpoint == "repo_download":
            name = values.get("name") or ""
            if name not in _REPO_DOWNLOAD_ALLOW:
                raise ValueError(f"repo_download não permitido: {name!r}")
            return name
        raise ValueError(f"endpoint desconhecido em url_for: {endpoint!r}")

    return url_for


def main() -> int:
    if not TEMPLATES_DIR.is_dir():
        print("Erro: pasta templates/ não encontrada.", file=sys.stderr)
        return 1
    if not STATIC_DIR.is_dir():
        print("Erro: pasta static/ não encontrada.", file=sys.stderr)
        return 1

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("index.html")
    html = template.render(url_for=build_url_for())

    if SITE_DIR.exists():
        shutil.rmtree(SITE_DIR)
    SITE_DIR.mkdir(parents=True)

    (SITE_DIR / "index.html").write_text(html, encoding="utf-8")
    shutil.copytree(STATIC_DIR, SITE_DIR / "static")

    for name in _REPO_DOWNLOAD_ALLOW:
        src = BASE_DIR / name
        if src.is_file():
            shutil.copy2(src, SITE_DIR / name)
        else:
            print(f"Aviso: ficheiro da raiz em falta (download): {name}", file=sys.stderr)

    print(f"Export concluído: {SITE_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
