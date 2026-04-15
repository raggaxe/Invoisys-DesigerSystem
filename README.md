# Invoisys-DesigerSystem

Documentação viva do design system (Flask + templates Jinja + estáticos em `static/`).

## Executar localmente

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Abrir `http://127.0.0.1:8080/` (ou a porta definida por `PORT`).

## Export estático (GitHub Pages)

O GitHub Pages só serve ficheiros estáticos. O script gera `site/` com `index.html` já renderizado e caminhos `static/...` relativos (compatível com `https://<user>.github.io/<repo>/`).

```bash
pip install -r requirements.txt
python scripts/export_static_site.py
cd site && python3 -m http.server 8765
```

Abrir `http://127.0.0.1:8765/`. A pasta `site/` está no `.gitignore`; o CI gera-a em cada deploy.

## Publicar no GitHub Pages (uma vez no GitHub)

1. **Repositório** → **Settings** → **Pages**.
2. Em **Build and deployment** → **Source**, escolher **GitHub Actions** (não “Deploy from a branch” com a raiz do repo Flask).
3. Fazer **push** para `main` (ou disparar manualmente o workflow **Deploy GitHub Pages** em **Actions**).
4. Voltar a **Settings** → **Pages** e copiar o **URL** do site (após o primeiro deploy bem-sucedido, costuma ser `https://<seu-usuario>.github.io/Invoisys-DesigerSystem/` se o repositório se chamar assim).

O workflow está em [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

**Nota:** O servidor Flask (`app.py`) não é alterado; continua a ser a forma recomendada para desenvolvimento e para hospedar noutro serviço com Python (ex.: gunicorn). O Pages serve apenas o snapshot estático gerado pelo script.
