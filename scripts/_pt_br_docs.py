#!/usr/bin/env python3
"""
Padronização de vocabulário pt-PT → pt-BR na documentação (templates + demos + docs).

Uso na raiz do repositório:
    python3 scripts/_pt_br_docs.py

Não substitui tudo (imperativos e nuances exigem revisão humana). Serve para reaplicar
troca de termos base após adicionar páginas novas.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PATHS = [
    ROOT / "templates",
    ROOT / "static" / "css" / "docs",
    ROOT / "static" / "demos",
    ROOT / "scripts" / "_gen_tokens_css.py",
]


def iter_files():
    for p in PATHS:
        if p.is_file() and p.suffix in {".py"}:
            yield p
            continue
        if p.is_dir():
            yield from p.rglob("*.html")
            yield from p.rglob("*.css")
            yield from p.rglob("*.js")


def apply(text: str) -> str:
    phrases = [
        ("NomeFicheiro", "NomeArquivo"),
        ("passa o rato", "passe o mouse"),
        ("Passa o rato", "Passe o mouse"),
        ("Tem a certeza", "Tem certeza"),
        ("«A carregar…»", "«Carregando…»"),
        ("centragem vertical", "centralização vertical"),
        ("descarregar ficheiro", "baixar arquivo"),
        ("descarregar arquivo", "baixar arquivo"),
        ("referenciares", "referenciar"),
        ("está a ser analisado", "está sendo analisado"),
        ("já adoptou", "já adotou"),
        ("Ligações com aspeto de botão", "Links com aspecto de botão"),
        ("Ligações com aspecto de botão", "Links com aspecto de botão"),
        ("Ligações em estilo texto", "Links em estilo texto"),
    ]
    for a, b in phrases:
        text = text.replace(a, b)

    text = re.sub(r"\bcentragem\b", "centralização", text)

    for a, b in [
        ("equipas", "equipes"),
        ("ficheiros", "arquivos"),
        ("ficheiro", "arquivo"),
        ("Ficheiro", "Arquivo"),
        ("ecrãs", "telas"),
        ("ecrã", "tela"),
        ("secções", "seções"),
        ("Secção", "Seção"),
        ("secção", "seção"),
        ("grelhas", "grades"),
        ("grelha", "grade"),
        ("Aspeto", "Aspecto"),
        ("aspeto", "aspecto"),
        ("registos", "registros"),
        ("registo", "registro"),
        ("utilizador", "usuário"),
        ("canónicos", "canônicos"),
        ("rácio", "proporção"),
    ]:
        text = text.replace(a, b)

    for a, b in [
        ("os teus arquivos", "os seus arquivos"),
        ("os teus", "os seus"),
        ("teus arquivos", "seus arquivos"),
        ("teus ", "seus "),
        (" ao teu ", " ao seu "),
        (" para o teu ", " para o seu "),
        (" para a tua ", " para a sua "),
        ("a tua ", "a sua "),
        (" na tua ", " na sua "),
        (" no teu ", " no seu "),
        (" do teu ", " do seu "),
        ("conforme o teu ", "conforme o seu "),
        (" teu JS", " seu JS"),
        (" teu bundle", " seu bundle"),
        (" teu ambiente", " seu ambiente"),
        (" teu projeto", " seu projeto"),
        ("Clica fora", "Clique fora"),
        ("Copia estes", "Copie estes"),
        ("copia o HTML", "copie o HTML"),
    ]:
        text = text.replace(a, b)

    text = text.replace("por baixo", "abaixo")
    text = text.replace("Por baixo", "Abaixo")
    text = text.replace("à medida", "sob medida")
    text = re.sub(r"\bequipa\b", "equipe", text)
    text = text.replace("o aspecto replica os botões", "o aspecto reproduz os botões")
    text = text.replace("no mesmo tela", "na mesma tela")
    text = text.replace("o mesmo tela", "a mesma tela")
    text = text.replace("em JavaScript no mesmo tela", "em JavaScript na mesma tela")
    text = re.sub(r"\bEm vistas\b", "Em views", text)
    text = re.sub(r"\bem vistas\b", "em views", text)
    text = text.replace("contentor", "contêiner")

    return text


def main() -> None:
    changed = 0
    for path in sorted(iter_files()):
        if not path.is_file():
            continue
        raw = path.read_text(encoding="utf-8")
        new = apply(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            print(path.relative_to(ROOT))
            changed += 1
    print(f"Arquivos alterados: {changed}")


if __name__ == "__main__":
    main()
