# Gera static/css/tokens.css (utilitários alinhados ao DS). Uso: python3 scripts/_gen_tokens_css.py
from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "static/css/tokens.css"

HEADER = r'''/*
 * =============================================================================
 * tokens.css — classes utilitárias (não são variáveis :root; essas estão em main.css)
 * =============================================================================
 * Finalidade: utilitários alinhados a Bootstrap (display, flex, gap, padding,
 * margin, texto, larguras). Não duplicar aqui regras de componentes de UI —
 * ver componentes.css para formulários, botões e modais.
 *
 * Ordem de cascade: varia por view (ex.: NF-e Beta carrega tokens por último;
 * Delivery Monitor carrega tokens antes de componentes). Após deduplicação,
 * utilitários canônicos vivem neste arquivo.
 *
 * Como criar uma nova tela: ver comentário em main.css (stack recomendado).
 *
 * Índice de seções:
 *   • Tipografia utilitária — headings, fs-*, color-text, font-*, fw-*
 *   • Larguras / altura — .w-100, .w-auto, .mw-100, .min-w-0, .h-100, .wl-30
 *   • Display — .d-none|flex|block|inline|inline-block|inline-flex|grid
 *   • Flex — .flex*, gap-*, justify-*, align-*, align-self-*
 *   • Texto — .text-start|center|end, .text-nowrap|break|truncate, .text-muted, .line-2
 *   • Espaçamento — .p-*, .m-*, .m-auto, .mt-*…mb-*, .ms-*, .me-*, …
 *   • Caixa / layout — .overflow-*, .position-*, .rounded*, .shadow-*
 *   • Fundos utilitários — .bg-success, .bg-info, .bg-danger
 * =============================================================================
 */

'''

SP = {
    0: "0",
    1: ".25rem",
    2: ".5rem",
    3: "1rem",
    4: "1.5rem",
    5: "3rem",
}


def emit_spacing() -> list[str]:
    lines: list[str] = []
    imp = " !important"
    for i, v in SP.items():
        lines.append(f".p-{i} {{ padding: {v}{imp}; }}\n")
    for i, v in SP.items():
        lines.append(
            f".px-{i} {{ padding-left: {v}{imp}; padding-right: {v}{imp}; }}\n"
        )
        lines.append(
            f".py-{i} {{ padding-top: {v}{imp}; padding-bottom: {v}{imp}; }}\n"
        )
        lines.append(f".pt-{i} {{ padding-top: {v}{imp}; }}\n")
        lines.append(f".pb-{i} {{ padding-bottom: {v}{imp}; }}\n")
        lines.append(f".ps-{i} {{ padding-left: {v}{imp}; }}\n")
        lines.append(f".pe-{i} {{ padding-right: {v}{imp}; }}\n")
    for i, v in SP.items():
        lines.append(f".m-{i} {{ margin: {v}{imp}; }}\n")
    lines.append(f".m-auto {{ margin: auto{imp}; }}\n")
    for i, v in SP.items():
        lines.append(
            f".mx-{i} {{ margin-left: {v}{imp}; margin-right: {v}{imp}; }}\n"
        )
        lines.append(
            f".my-{i} {{ margin-top: {v}{imp}; margin-bottom: {v}{imp}; }}\n"
        )
        lines.append(f".mt-{i} {{ margin-top: {v}{imp}; }}\n")
        lines.append(f".mb-{i} {{ margin-bottom: {v}{imp}; }}\n")
        lines.append(f".ms-{i} {{ margin-inline-start: {v}{imp}; }}\n")
        lines.append(f".me-{i} {{ margin-inline-end: {v}{imp}; }}\n")
    for i, v in SP.items():
        lines.append(f".gap-{i} {{ gap: {v}{imp}; }}\n")
    return lines


def main() -> None:
    jc_map = {
        "justify-content-start": "flex-start",
        "justify-content-end": "flex-end",
        "justify-content-center": "center",
        "justify-content-between": "space-between",
        "justify-content-around": "space-around",
        "justify-content-evenly": "space-evenly",
    }
    chunks: list[str] = [HEADER]

    chunks.append(
        """/* === Tipografia utilitária (headings) === */
.heading-xl {
    color: var(--cor-texto-secundario);
    font-family: var(--fonte-principal);
    font-size: var(--tamanho-xxxl);
    padding: 0;
    margin: var(--none);
}

.heading-md {
    color: var(--cor-texto-secundario);
    font-family: var(--fonte-principal);
    font-size: var(--tamanho-md);
    margin: var(--none);
}

.heading-sm {
    color: var(--cor-texto-secundario);
    font-family: var(--fonte-principal);
    font-size: var(--tamanho-sm);
    margin: var(--none);
}

.heading-xs {
    color: var(--cor-texto-secundario);
    font-family: var(--fonte-principal);
    font-size: var(--tamanho-xs);
    margin: var(--none);
}

"""
    )

    chunks.append(
        """/* === Larguras === */
.w-100 {
    width: 100% !important;
}

.w-auto {
    width: auto !important;
}

.mw-100 {
    max-width: 100% !important;
}

.min-w-0 {
    min-width: 0 !important;
}

.h-100 {
    height: 100% !important;
}

.fs-1 {
    font-size: calc(1.375rem + 1.5vw) !important;
}

.fs-2 {
    font-size: calc(1.325rem + 0.9vw) !important;
}

.fs-3 {
    font-size: calc(1.3rem + 0.6vw) !important;
}

.fs-4 {
    font-size: calc(1.275rem + 0.3vw) !important;
}

.fs-5 {
    font-size: 1.25rem !important;
}

.fs-6 {
    font-size: 1rem !important;
}

"""
    )

    chunks.append(
        """/* === Cor e peso de fonte (utilitários) === */
.color-text {
    color: var(--cor-texto-secundario);
}

.font-extra-leve {
    font-weight: var(--peso-fonte-extra-leve);
}

.font-leve {
    font-weight: var(--peso-fonte-leve);
}

.font-normal {
    font-weight: var(--peso-fonte-normal);
}

.font-strong {
    font-weight: var(--peso-fonte-strong);
}

.font-bold {
    font-weight: var(--peso-fonte-negrito);
}

.font-weight-bold {
    font-weight: var(--peso-fonte-negrito);
}

.fw-light {
    font-weight: 300 !important;
}

.fw-normal {
    font-weight: 400 !important;
}

.fw-semibold {
    font-weight: 600 !important;
}

.fw-bold {
    font-weight: 700 !important;
}

"""
    )

    chunks.append(
        """/* === Texto === */
.text-start {
    text-align: left !important;
}

.text-center {
    text-align: center !important;
}

.text-end {
    text-align: right !important;
}

.text-nowrap {
    white-space: nowrap !important;
}

.text-break {
    word-wrap: break-word !important;
    word-break: break-word !important;
}

.text-truncate {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

.text-muted {
    color: var(--cor-texto-secundario, #5b5b5b) !important;
}

.line-2 {
    line-height: 3.5rem;
}

.wl-30 {
    max-width: 330px;
}

"""
    )

    chunks.append(
        """/* === Display === */
.d-none {
    display: none !important;
}

.d-block {
    display: block !important;
}

.d-inline {
    display: inline !important;
}

.d-inline-block {
    display: inline-block !important;
}

.d-flex {
    display: flex !important;
}

.flex {
    display: flex !important;
}

.d-inline-flex {
    display: inline-flex !important;
}

.d-grid {
    display: grid !important;
}

"""
    )

    chunks.append(
        """/* === Flex: direção e wrap === */
.flex-row {
    flex-direction: row !important;
}

.flex-row-reverse {
    flex-direction: row-reverse !important;
}

.flex-column {
    flex-direction: column !important;
}

.flex-column-reverse {
    flex-direction: column-reverse !important;
}

.flex-wrap {
    flex-wrap: wrap !important;
}

.flex-nowrap {
    flex-wrap: nowrap !important;
}

"""
    )

    chunks.append("/* === justify-content === */\n")
    for cls, val in jc_map.items():
        chunks.append(f".{cls} {{ justify-content: {val} !important; }}\n")

    chunks.append(
        """/* === align-items === */
.align-items-start {
    align-items: flex-start !important;
}

.align-items-end {
    align-items: flex-end !important;
}

.align-items-center {
    align-items: center !important;
}

.align-items-baseline {
    align-items: baseline !important;
}

.align-items-stretch {
    align-items: stretch !important;
}

"""
    )

    chunks.append(
        """/* === align-self === */
.align-self-auto {
    align-self: auto !important;
}

.align-self-start {
    align-self: flex-start !important;
}

.align-self-end {
    align-self: flex-end !important;
}

.align-self-center {
    align-self: center !important;
}

.align-self-stretch {
    align-self: stretch !important;
}

.align-self-baseline {
    align-self: baseline !important;
}

"""
    )

    chunks.append(
        """/* === flex grow / shrink / fill === */
.flex-grow-0 {
    flex-grow: 0 !important;
}

.flex-grow-1 {
    flex-grow: 1 !important;
}

.flex-shrink-0 {
    flex-shrink: 0 !important;
}

.flex-shrink-1 {
    flex-shrink: 1 !important;
}

.flex-fill {
    flex: 1 1 auto !important;
}

"""
    )

    chunks.append("/* === Espaçamento (escala 0–5) === */\n")
    chunks.extend(emit_spacing())

    chunks.append(
        """/* === Overflow === */
.overflow-auto {
    overflow: auto !important;
}

.overflow-hidden {
    overflow: hidden !important;
}

.overflow-visible {
    overflow: visible !important;
}

.overflow-scroll {
    overflow: scroll !important;
}

"""
    )

    chunks.append(
        """/* === Posicionamento === */
.position-static {
    position: static !important;
}

.position-relative {
    position: relative !important;
}

.position-absolute {
    position: absolute !important;
}

.position-fixed {
    position: fixed !important;
}

.position-sticky {
    position: sticky !important;
}

"""
    )

    chunks.append(
        """/* === Bordas e raios === */
.border {
    border: var(--borda-fina) !important;
}

.border-0 {
    border: 0 !important;
}

.rounded-0 {
    border-radius: 0 !important;
}

.rounded {
    border-radius: var(--radius-md) !important;
}

"""
    )

    chunks.append(
        """/* === Sombras === */
.shadow-sm {
    box-shadow: var(--sombra-leve) !important;
}

.shadow {
    box-shadow: var(--sombra-media) !important;
}

"""
    )

    chunks.append(
        """/* === Fundos utilitários === */
.bg-success {
    background-color: var(--cor-indicador-sucesso) !important;
}

.bg-info {
    background-color: var(--cor-indicador-info) !important;
}

.bg-danger {
    background-color: var(--cor-indicador-perigo) !important;
}

"""
    )

    OUT.write_text("".join(chunks))
    print("Wrote", OUT, "lines", len(OUT.read_text().splitlines()))


if __name__ == "__main__":
    main()
