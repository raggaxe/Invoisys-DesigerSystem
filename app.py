"""
Servidor mínimo para disponibilizar a documentação do design system.
Templates: templates/ · Ficheiros estáticos: static/ (URL /static/...).

Uso local: python app.py
  — Com debug ativo (padrão), o servidor recarrega ao guardar .py, templates e CSS/JS
    em static/. Desativa com: FLASK_DEBUG=0 python app.py

Produção: gunicorn -w 2 -b 0.0.0.0:8000 app:app
"""

import os
from pathlib import Path

from flask import Flask, abort, render_template, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")
app.config["TEMPLATES_AUTO_RELOAD"] = True


def _dev_extra_watch_files() -> list[str]:
    """Ficheiros extra a vigiar pelo reloader (além dos .py)."""
    paths: list[Path] = []
    templates = BASE_DIR / "templates"
    if templates.is_dir():
        paths.extend(templates.rglob("*.html"))
    if STATIC_DIR.is_dir():
        paths.extend(STATIC_DIR.rglob("*.css"))
        paths.extend(STATIC_DIR.rglob("*.js"))
    return [str(p.resolve()) for p in paths if p.is_file()]


_REPO_DOWNLOAD_ALLOW = frozenset({"requirements.txt", "app.py", ".gitignore"})


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/download/<name>")
def repo_download(name):
    """Ficheiros na raiz do repositório (apenas nomes na lista branca)."""
    if name not in _REPO_DOWNLOAD_ALLOW:
        abort(404)
    path = BASE_DIR / name
    if not path.is_file():
        abort(404)
    return send_from_directory(str(BASE_DIR), name, as_attachment=True)


def main():
    port = int(os.environ.get("PORT", "8080"))
    env = os.environ.get("FLASK_DEBUG", "1").strip().lower()
    debug = env not in ("0", "false", "no", "off")

    kwargs: dict = dict(host="0.0.0.0", port=port, debug=debug)
    if debug:
        kwargs["extra_files"] = _dev_extra_watch_files()

    app.run(**kwargs)


if __name__ == "__main__":
    main()
