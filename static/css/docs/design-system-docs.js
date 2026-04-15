(function () {
    "use strict";

    var panels = document.querySelectorAll(".invoisys-ds-panel");
    var navButtons = document.querySelectorAll("[data-ds-target]");
    var tocNav = document.getElementById("invoisys-ds-toc-nav");
    var scrollRaf = null;

    function panelSlugFromId(panelEl) {
        if (!panelEl || !panelEl.id || panelEl.id.indexOf("panel-") !== 0) return null;
        return panelEl.id.slice("panel-".length);
    }

    var tocHeadingSelector =
        "h1[id], h2.invoisys-ds-section-title[id], h3.invoisys-ds-subsection-title[id]";

    function tocLabelForHeading(el) {
        if (!el) return "";
        var clone = el.cloneNode(true);
        clone.querySelectorAll(".invoisys-ds-doc-prioridade-mark").forEach(function (m) {
            m.remove();
        });
        return (clone.textContent || "").replace(/\s+/g, " ").trim();
    }

    /** Linha «actual» abaixo da topbar fixa — usada no scroll-spy e no scroll programático (px). */
    function getTocStickyOffsetPx() {
        var tb = document.querySelector(".invoisys-ds-topbar");
        var h = tb ? tb.getBoundingClientRect().height : 50;
        var pad = 12;
        try {
            var st = window.getComputedStyle(document.body);
            var p = parseFloat(st.getPropertyValue("--invoisys-ds-doc-anchor-pad"));
            if (!isNaN(p)) {
                pad = p;
            }
        } catch (e1) {
            /* ignore */
        }
        return Math.round(h) + pad;
    }

    function scrollPageToShowElement(el, smooth) {
        if (!el) return;
        var pad = getTocStickyOffsetPx();
        var y = el.getBoundingClientRect().top + window.pageYOffset - pad;
        window.scrollTo({ top: Math.max(0, y), behavior: smooth ? "smooth" : "auto" });
    }

    /** Evita que o scroll-spy sobrescreva o destaque durante scroll suave pós-clique no TOC. */
    var tocActiveLockUntil = 0;

    function setTocActiveByTargetId(id, lockMs) {
        if (!tocNav || !id) return;
        tocNav.querySelectorAll("a[href^='#']").forEach(function (a) {
            a.removeAttribute("aria-current");
        });
        var active = tocNav.querySelector('a[href="#' + id + '"]');
        if (active) {
            active.setAttribute("aria-current", "location");
        }
        tocActiveLockUntil = Date.now() + (typeof lockMs === "number" ? lockMs : 550);
    }

    function maybeInitSelect2Demos(panelId) {
        if (panelId !== "inputs") return;

        function bindSelect2Demos() {
            if (typeof window.jQuery === "undefined" || !window.jQuery.fn || typeof window.jQuery.fn.select2 !== "function") {
                return;
            }
            var $ = window.jQuery;
            var $body = $(document.body);

            var $single = $("#ds-select2-single-demo");
            if ($single.length && !$single.hasClass("select2-hidden-accessible")) {
                try {
                    $single.select2({
                        width: "100%",
                        placeholder: "Selecione um status de Captura",
                        allowClear: true,
                        dropdownParent: $body,
                        minimumResultsForSearch: 0,
                        dropdownCssClass: "invoisys-ds-select2-dropdown-portal"
                    });
                } catch (err) {
                    if (typeof console !== "undefined" && console.warn) {
                        console.warn("Invoisys DS: Select2 (demo único)", err);
                    }
                }
            }

            var $multi = $("#ds-select2-multi-demo");
            if ($multi.length && !$multi.hasClass("select2-hidden-accessible")) {
                try {
                    $multi.select2({
                        width: "100%",
                        dropdownParent: $body
                    });
                } catch (err2) {
                    if (typeof console !== "undefined" && console.warn) {
                        console.warn("Invoisys DS: Select2 (demo múltiplo)", err2);
                    }
                }
            }
        }

        var waitCount = 0;
        function waitForJquerySelect2() {
            if (typeof window.jQuery !== "undefined" && window.jQuery.fn && typeof window.jQuery.fn.select2 === "function") {
                bindSelect2Demos();
                setTimeout(bindSelect2Demos, 50);
                setTimeout(bindSelect2Demos, 200);
                setTimeout(bindSelect2Demos, 500);
                return;
            }
            waitCount += 1;
            if (waitCount < 150) {
                setTimeout(waitForJquerySelect2, 40);
            } else if (typeof console !== "undefined" && console.warn) {
                console.warn("Invoisys DS: jQuery ou Select2 não carregaram (ver static/js/vendor).");
            }
        }

        waitForJquerySelect2();
    }

    /** Select2 nas prévias «Tabelas · cabeçalho» e «Listagem completa» (select de empresa, sem label). */
    function maybeInitTabelasCabecalhoSelect2(panelId) {
        if (panelId !== "tabelas-cabecalho" && panelId !== "tabelas-listagem-completa") {
            return;
        }

        function syncCabecalhoEmpresaSelectTitle($, $el) {
            var hint = $el.attr("title");
            if (!hint) {
                return;
            }
            var $next = $el.next(".select2-container");
            if ($next.length) {
                $next.find(".select2-selection").attr("title", hint);
            }
        }

        /**
         * @returns {boolean} true se pelo menos um select existir e estiver (ou ficar) com Select2 ativo
         */
        function bindCabecalhoEmpresaSelect2() {
            if (typeof window.jQuery === "undefined" || !window.jQuery.fn || typeof window.jQuery.fn.select2 !== "function") {
                return false;
            }
            var $ = window.jQuery;
            var selectors = ["#docCabecalhoDemoEmpresaSelect", "#docListaCompletaEmpresaSelect"];
            var anyOk = false;
            for (var si = 0; si < selectors.length; si += 1) {
                var $el = $(selectors[si]);
                if (!$el.length) {
                    continue;
                }
                if ($el.hasClass("select2-hidden-accessible")) {
                    syncCabecalhoEmpresaSelectTitle($, $el);
                    anyOk = true;
                    continue;
                }
                try {
                    $el.select2({
                        width: "100%",
                        allowClear: false,
                        dropdownParent: $(document.body),
                        minimumResultsForSearch: 0,
                        dropdownCssClass: "invoisys-ds-select2-dropdown-portal"
                    });
                } catch (errCab) {
                    if (typeof console !== "undefined" && console.warn) {
                        console.warn("Invoisys DS: Select2 (demo cabeçalho empresa)", errCab);
                    }
                    continue;
                }
                if ($el.hasClass("select2-hidden-accessible")) {
                    syncCabecalhoEmpresaSelectTitle($, $el);
                    anyOk = true;
                }
            }
            return anyOk;
        }

        var waitCab = 0;
        function waitForJquerySelect2Cabecalho() {
            if (bindCabecalhoEmpresaSelect2()) {
                setTimeout(bindCabecalhoEmpresaSelect2, 50);
                setTimeout(bindCabecalhoEmpresaSelect2, 200);
                setTimeout(bindCabecalhoEmpresaSelect2, 500);
                return;
            }
            waitCab += 1;
            if (waitCab < 150) {
                setTimeout(waitForJquerySelect2Cabecalho, 40);
            } else if (typeof console !== "undefined" && console.warn) {
                console.warn("Invoisys DS: jQuery ou Select2 não carregaram para cabeçalho (ver static/js/vendor).");
            }
        }

        waitForJquerySelect2Cabecalho();
        /* Re-tentar após layout do painel (flex + painel recém-visível podem dar largura 0 na 1.ª frame). */
        [90, 220, 450].forEach(function (ms) {
            setTimeout(function () {
                bindCabecalhoEmpresaSelect2();
            }, ms);
        });
    }

    /**
     * Anexa bootstrap-daterangepicker a um input (Moment + locale PT-BR alinhados à demo Inputs).
     * @param {JQuery} $dr input.date-range-input
     * @param {{ skipInitialRangeValue?: boolean }} [opts] — se true, não preenche o campo (ex.: placeholder «Selecione um intervalo»).
     */
    function invoisysDsAttachDaterangePicker($dr, opts) {
        opts = opts || {};
        if (typeof window.jQuery === "undefined" || !window.jQuery.fn) {
            return;
        }
        if (typeof window.moment === "undefined") {
            return;
        }
        if (typeof window.jQuery.fn.daterangepicker !== "function") {
            return;
        }
        var $ = window.jQuery;
        var m = window.moment;
        if (!$dr || !$dr.length || $dr.data("daterangepicker")) {
            return;
        }

        var hoje = m();
        $dr.daterangepicker({
            showDropdowns: false,
            autoApply: true,
            showCustomRangeLabel: false,
            linkedCalendars: true,
            autoUpdateInput: false,
            startDate: hoje,
            endDate: hoje,
            ranges: {
                Ontem: [m().subtract(1, "days"), m().subtract(1, "days")],
                Hoje: [m(), m()],
                "Semana Atual": [m().startOf("week"), m().endOf("week")],
                "Mês Atual": [m().startOf("month"), m().endOf("month")],
                "Semana Passada": [
                    m().subtract(1, "week").startOf("week"),
                    m().subtract(1, "week").endOf("week")
                ],
                "Mês Passado": [
                    m().subtract(1, "month").startOf("month"),
                    m().subtract(1, "month").endOf("month")
                ],
                "Ano Atual": [m().startOf("year"), m().endOf("year")]
            },
            locale: {
                format: "DD/MM/YYYY",
                separator: " - ",
                applyLabel: "Aplicar",
                cancelLabel: "Limpar",
                fromLabel: "De: ",
                toLabel: "Até: ",
                customRangeLabel: "Data Específica",
                weekLabel: "Sem.",
                daysOfWeek: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
                monthNames: [
                    "Janeiro",
                    "Fevereiro",
                    "Março",
                    "Abril",
                    "Maio",
                    "Junho",
                    "Julho",
                    "Agosto",
                    "Setembro",
                    "Outubro",
                    "Novembro",
                    "Dezembro"
                ],
                firstDay: 0
            },
            alwaysShowCalendars: true
        });

        if (!opts.skipInitialRangeValue) {
            $dr.val(hoje.format("DD/MM/YYYY") + " - " + hoje.format("DD/MM/YYYY"));
        }
        $dr.off("apply.daterangepicker.invoisysDs").on("apply.daterangepicker.invoisysDs", function (e, picker) {
            $(this).val(picker.startDate.format("DD/MM/YYYY") + " - " + picker.endDate.format("DD/MM/YYYY"));
        });

        var $wrap = $dr.closest(".invoisys-ds-daterange-demo--portal");
        $dr.off("show.daterangepicker.invoisysDs hide.daterangepicker.invoisysDs");
        $dr.on("show.daterangepicker.invoisysDs", function () {
            if ($wrap.length) {
                $wrap.addClass("invoisys-ds-daterange-demo--open");
            }
        });
        $dr.on("hide.daterangepicker.invoisysDs", function () {
            if ($wrap.length) {
                $wrap.removeClass("invoisys-ds-daterange-demo--open");
            }
        });
    }

    function maybeInitDateRangeDemo(panelId) {
        if (panelId !== "inputs") return;

        function bindDateRangeDemo() {
            invoisysDsAttachDaterangePicker(window.jQuery("#ds-daterange-demo"));
        }

        var waitDr = 0;
        function waitForMomentDaterangepicker() {
            if (
                typeof window.jQuery !== "undefined" &&
                window.jQuery.fn &&
                typeof window.moment !== "undefined" &&
                typeof window.jQuery.fn.daterangepicker === "function"
            ) {
                bindDateRangeDemo();
                setTimeout(bindDateRangeDemo, 50);
                setTimeout(bindDateRangeDemo, 200);
                return;
            }
            waitDr += 1;
            if (waitDr < 150) {
                setTimeout(waitForMomentDaterangepicker, 40);
            } else if (typeof console !== "undefined" && console.warn) {
                console.warn("Invoisys DS: Moment ou daterangepicker não carregaram (ver static/js/vendor).");
            }
        }

        waitForMomentDaterangepicker();
    }

    function maybeInitTabelasCabecalhoDateRange(panelId) {
        if (panelId !== "tabelas-cabecalho" && panelId !== "tabelas-listagem-completa") {
            return;
        }

        function bindCabecalhoDateRange() {
            if (typeof window.jQuery === "undefined" || !window.jQuery.fn) {
                return false;
            }
            if (typeof window.moment === "undefined" || typeof window.jQuery.fn.daterangepicker !== "function") {
                return false;
            }
            var $ = window.jQuery;
            var any = false;
            function attachRange(sel, opts) {
                var $x = $(sel);
                if ($x.length) {
                    invoisysDsAttachDaterangePicker($x, opts || {});
                    any = true;
                }
            }
            attachRange("#docCabecalhoDemoDateRange");
            attachRange("#docCabecalhoDemoFiltroDateEntrega", { skipInitialRangeValue: true });
            attachRange("#docCabecalhoDemoFiltroDateRecusa", { skipInitialRangeValue: true });
            attachRange("#docListaCompletaDateRange");
            attachRange("#docListaCompletaFiltroDateEntrega", { skipInitialRangeValue: true });
            attachRange("#docListaCompletaFiltroDateRecusa", { skipInitialRangeValue: true });
            return any;
        }

        var waitCabDr = 0;
        function waitCabDrLoop() {
            if (bindCabecalhoDateRange()) {
                setTimeout(bindCabecalhoDateRange, 50);
                setTimeout(bindCabecalhoDateRange, 200);
                return;
            }
            waitCabDr += 1;
            if (waitCabDr < 150) {
                setTimeout(waitCabDrLoop, 40);
            } else if (typeof console !== "undefined" && console.warn) {
                console.warn("Invoisys DS: Moment ou daterangepicker não carregaram (cabeçalho tabelas).");
            }
        }

        waitCabDrLoop();
    }

    function showPanel(id, opts) {
        opts = opts || {};
        tocActiveLockUntil = 0;
        panels.forEach(function (p) {
            p.hidden = p.id !== "panel-" + id;
        });
        navButtons.forEach(function (btn) {
            var on = btn.getAttribute("data-ds-target") === id;
            btn.setAttribute("aria-current", on ? "page" : "false");
        });
        if (!opts.skipHash && history.replaceState) {
            history.replaceState(null, "", "#" + id);
        }
        if (!opts.skipScrollTop) {
            window.scrollTo({ top: 0, behavior: "auto" });
        }
        document.querySelectorAll("[data-invoisys-ds-modal-demo]:not([hidden])").forEach(function (m) {
            m.hidden = true;
            m.setAttribute("aria-hidden", "true");
        });
        document.body.style.overflow = "";
        buildToc();
        requestAnimationFrame(updateTocActiveFromScroll);
        /* Duplo rAF: o painel deixa de estar [hidden] e o layout (flex/larguras) estabiliza antes de Select2/daterange. */
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                maybeInitSelect2Demos(id);
                maybeInitTabelasCabecalhoSelect2(id);
                maybeInitTabelasCabecalhoDateRange(id);
                maybeInitDateRangeDemo(id);
            });
        });
    }

    /**
     * Abre o painel certo e faz scroll ao alvo. Usado no hashchange e nos cliques do TOC
     * (evita desincronia entre highlight do menu e a secção visível).
     */
    function navigateToFragment(raw, opts) {
        opts = opts || {};
        var smooth = opts.smooth !== false;
        var skipReplaceHash = !!opts.skipReplaceHash;
        var fixInvalidHash = !!opts.fixInvalidHash;

        function replaceHash(hash) {
            if (skipReplaceHash || !history.replaceState) return;
            history.replaceState(null, "", hash.indexOf("#") === 0 ? hash : "#" + hash);
        }

        if (!raw) {
            showPanel("introducao", { skipHash: true });
            replaceHash("introducao");
            requestAnimationFrame(updateTocActiveFromScroll);
            return;
        }

        var el = document.getElementById(raw);
        if (el) {
            var panel = el.closest(".invoisys-ds-panel");
            if (panel) {
                var slug = panelSlugFromId(panel);
                if (slug) {
                    showPanel(slug, { skipHash: true, skipScrollTop: true });
                    if (!skipReplaceHash) {
                        replaceHash(raw);
                    }
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            scrollPageToShowElement(el, smooth);
                            setTocActiveByTargetId(raw, smooth ? 650 : 0);
                            if (!smooth) {
                                updateTocActiveFromScroll();
                            }
                        });
                    });
                    return;
                }
            }
        }

        if (navTargetExists(raw)) {
            showPanel(raw, { skipHash: true });
            if (!skipReplaceHash) {
                replaceHash(raw);
            }
            requestAnimationFrame(updateTocActiveFromScroll);
            return;
        }

        showPanel("introducao", { skipHash: true });
        if ((!skipReplaceHash || fixInvalidHash) && history.replaceState) {
            history.replaceState(null, "", "#introducao");
        }
        requestAnimationFrame(updateTocActiveFromScroll);
    }

    function buildToc() {
        if (!tocNav) return;
        tocNav.innerHTML = "";
        var visible = document.querySelector(".invoisys-ds-panel:not([hidden])");
        if (!visible) return;
        var headings = visible.querySelectorAll(tocHeadingSelector);
        if (!headings.length) return;
        var ul = document.createElement("ul");
        ul.className = "invoisys-ds-toc-list";
        headings.forEach(function (el) {
            if (!el.id) return;
            if (el.matches("h1")) return;
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.href = "#" + el.id;
            a.textContent = tocLabelForHeading(el);
            if (el.matches("h3.invoisys-ds-subsection-title")) {
                li.classList.add("invoisys-ds-toc-list__sub");
            }
            li.appendChild(a);
            ul.appendChild(li);
        });
        tocNav.appendChild(ul);
    }

    function updateTocActiveFromScroll() {
        if (!tocNav) return;
        if (Date.now() < tocActiveLockUntil) {
            return;
        }
        var panel = document.querySelector(".invoisys-ds-panel:not([hidden])");
        if (!panel) return;
        var heads = Array.prototype.slice.call(panel.querySelectorAll(tocHeadingSelector)).filter(function (h) {
            return h.id && !h.matches("h1");
        });
        var links = tocNav.querySelectorAll("a[href^='#']");
        var offset = getTocStickyOffsetPx();
        var current = null;

        /* Último título cuja linha de topo já passou da zona «abaixo da topbar» (coordenadas de viewport). */
        heads.forEach(function (h) {
            var top = h.getBoundingClientRect().top;
            if (top <= offset + 2) {
                current = h;
            }
        });

        /*
         * Última seção: o h2 pode ficar sempre um pouco abaixo da linha (pouco scroll possível depois
         * do conteúdo anterior). Sem isto, o TOC continua no penúltimo item (ex.: Snippet em vez de Referência).
         */
        var lastH = heads[heads.length - 1];
        if (lastH && heads.length >= 2) {
            var lr = lastH.getBoundingClientRect();
            var penH = heads[heads.length - 2];
            var pr = penH.getBoundingClientRect();
            if (lr.top > offset + 2 && lr.top < window.innerHeight) {
                if (pr.bottom < offset + 2) {
                    current = lastH;
                }
            }
        }

        var maxScroll = Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight
        );
        if (heads.length && window.scrollY >= maxScroll - 2) {
            current = heads[heads.length - 1];
        }

        links.forEach(function (a) {
            a.removeAttribute("aria-current");
        });
        if (current && current.id) {
            var active = tocNav.querySelector('a[href="#' + current.id + '"]');
            if (active) {
                active.setAttribute("aria-current", "location");
            }
        }
    }

    function onScroll() {
        if (scrollRaf) {
            cancelAnimationFrame(scrollRaf);
        }
        scrollRaf = requestAnimationFrame(updateTocActiveFromScroll);
    }

    navButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            showPanel(btn.getAttribute("data-ds-target"), {});
        });
    });

    if (tocNav) {
        tocNav.addEventListener("click", function (e) {
            var a = e.target.closest && e.target.closest("a[href^='#']");
            if (!a || !tocNav.contains(a)) return;
            var href = a.getAttribute("href");
            if (!href || href.length < 2) return;
            e.preventDefault();
            var id = href.slice(1);
            setTocActiveByTargetId(id, 650);
            navigateToFragment(id, { skipReplaceHash: false, smooth: true });
        });
    }

    document.querySelectorAll("[data-invoisys-tabbar]").forEach(function (root) {
        root.addEventListener("click", function (e) {
            var t = e.target && e.target.closest ? e.target.closest(".invoisys-tabbar__tab") : null;
            if (!t || !root.contains(t)) return;
            if (t.disabled || t.getAttribute("aria-disabled") === "true") return;
            root.querySelectorAll(".invoisys-tabbar__tab").forEach(function (btn) {
                var on = btn === t;
                btn.classList.toggle("invoisys-tabbar__tab--active", on);
                btn.setAttribute("aria-selected", on ? "true" : "false");
            });
        });
    });

    document.addEventListener("click", function (e) {
        var docRoot = document.querySelector(".invoisys-ds-doc");
        if (!docRoot || !docRoot.contains(e.target)) {
            return;
        }
        var cabBtn =
            e.target.closest &&
            e.target.closest(
                '[data-testid="ds-tabelas-cabecalho-demo-metricas"], [data-testid="ds-tabelas-cabecalho-demo-filtrar"], [data-testid="ds-tabelas-listagem-completa-demo-metricas"], [data-testid="ds-tabelas-listagem-completa-demo-filtrar"]'
            );
        var cabPanel =
            cabBtn &&
            (cabBtn.closest("#panel-tabelas-cabecalho") || cabBtn.closest("#panel-tabelas-listagem-completa"));
        if (cabBtn && cabPanel) {
            e.preventDefault();
            var ctrlId = cabBtn.getAttribute("aria-controls");
            var pnl = ctrlId ? document.getElementById(ctrlId) : null;
            if (!pnl) {
                return;
            }
            var nowOpen = cabBtn.getAttribute("aria-expanded") === "true";
            var tid = cabBtn.getAttribute("data-testid");
            var filtrar =
                tid === "ds-tabelas-cabecalho-demo-filtrar" || tid === "ds-tabelas-listagem-completa-demo-filtrar";
            if (nowOpen) {
                pnl.classList.add("d-none");
                pnl.setAttribute("aria-hidden", "true");
                cabBtn.setAttribute("aria-expanded", "false");
                cabBtn.classList.remove("invoisys-ds-doc-cabecalho-chip-expanded");
                if (!filtrar) {
                    var sp = cabBtn.querySelector(".heading-sm");
                    if (sp) {
                        sp.textContent = "Mostrar painel";
                    }
                }
            } else {
                pnl.classList.remove("d-none");
                pnl.setAttribute("aria-hidden", "false");
                cabBtn.setAttribute("aria-expanded", "true");
                cabBtn.classList.add("invoisys-ds-doc-cabecalho-chip-expanded");
                if (!filtrar) {
                    var sp2 = cabBtn.querySelector(".heading-sm");
                    if (sp2) {
                        sp2.textContent = "Ocultar painel";
                    }
                }
            }
            if (filtrar) {
                var chev = cabBtn.querySelector(".fa-chevron-down") || cabBtn.querySelector(".fa-chevron-up");
                if (chev) {
                    var expanded = cabBtn.getAttribute("aria-expanded") === "true";
                    chev.classList.toggle("fa-chevron-down", !expanded);
                    chev.classList.toggle("fa-chevron-up", expanded);
                }
            }
            return;
        }
        var wfToggle = e.target.closest && e.target.closest(".invoisys-ds-doc-workflow-demo a[data-ds-workflow-toggle]");
        if (wfToggle) {
            e.preventDefault();
            var pnl = wfToggle.closest(".panel");
            if (!pnl || !docRoot.contains(pnl)) {
                return;
            }
            var content = pnl.querySelector(".panel-content");
            if (!content) {
                return;
            }
            var icon = wfToggle.querySelector(".icon-toggle");
            var expanded = wfToggle.getAttribute("aria-expanded") === "true";
            if (expanded) {
                content.setAttribute("hidden", "hidden");
                wfToggle.setAttribute("aria-expanded", "false");
                if (icon) {
                    icon.classList.remove("fa-chevron-up");
                    icon.classList.add("fa-chevron-down");
                }
            } else {
                content.removeAttribute("hidden");
                wfToggle.setAttribute("aria-expanded", "true");
                if (icon) {
                    icon.classList.remove("fa-chevron-down");
                    icon.classList.add("fa-chevron-up");
                }
            }
            return;
        }
        var colTrigger = e.target.closest ? e.target.closest("[data-modal-collapse-trigger]") : null;
        if (colTrigger) {
            e.preventDefault();
            var pnl = colTrigger.closest(".modal-detalhes-panel");
            if (!pnl || !docRoot.contains(pnl)) {
                return;
            }
            var expanded = pnl.classList.contains("modal-detalhes-panel--expanded");
            if (expanded) {
                pnl.classList.remove("modal-detalhes-panel--expanded");
                pnl.classList.add("modal-detalhes-panel--collapsed");
                colTrigger.setAttribute("aria-expanded", "false");
                var tit = pnl.querySelector(".modal-detalhes-panel-toggle b");
                var nome = tit ? tit.textContent.replace(/\s+/g, " ").trim() : "secção";
                colTrigger.setAttribute("aria-label", "Expandir " + nome);
                if (colTrigger.hasAttribute("title")) {
                    colTrigger.setAttribute("title", "Expandir");
                }
            } else {
                pnl.classList.add("modal-detalhes-panel--expanded");
                pnl.classList.remove("modal-detalhes-panel--collapsed");
                colTrigger.setAttribute("aria-expanded", "true");
                var tit2 = pnl.querySelector(".modal-detalhes-panel-toggle b");
                var nome2 = tit2 ? tit2.textContent.replace(/\s+/g, " ").trim() : "secção";
                colTrigger.setAttribute("aria-label", "Recolher " + nome2);
                if (colTrigger.hasAttribute("title")) {
                    colTrigger.setAttribute("title", "Recolher");
                }
            }
            var chev = pnl.querySelector(".modal-detalhes-chevron");
            if (chev) {
                if (pnl.classList.contains("modal-detalhes-panel--expanded")) {
                    chev.classList.remove("fa-chevron-down");
                    chev.classList.add("fa-chevron-up");
                } else {
                    chev.classList.remove("fa-chevron-up");
                    chev.classList.add("fa-chevron-down");
                }
            }
            return;
        }
        var tabLink = e.target.closest ? e.target.closest("ul.modal-detalhes-tabs a[href^='#']") : null;
        if (tabLink && tabLink.getAttribute("data-toggle") === "tab") {
            var liTab = tabLink.closest("li");
            if (liTab && liTab.classList.contains("disabled")) {
                e.preventDefault();
                return;
            }
            var ulTabs = tabLink.closest("ul.modal-detalhes-tabs");
            if (!ulTabs || !docRoot.contains(tabLink)) {
                return;
            }
            e.preventDefault();
            var href = tabLink.getAttribute("href");
            if (!href || href.charAt(0) !== "#") {
                return;
            }
            var tid = href.slice(1);
            var troot = ulTabs.closest(
                '[data-testid="modal-detalhes-container"], [data-testid="ds-modal-detalhes-tabs-container"], [data-testid="ds-modal-detalhes-tabs-container-disabled"]'
            );
            if (!troot || !docRoot.contains(troot)) {
                return;
            }
            ulTabs.querySelectorAll("li").forEach(function (li) {
                li.classList.remove("active");
            });
            var liOn = tabLink.closest("li");
            if (liOn) {
                liOn.classList.add("active");
            }
            troot.querySelectorAll(".tab-content .tab-pane").forEach(function (pane) {
                var on = pane.id === tid;
                pane.classList.toggle("active", on);
                if (on) {
                    pane.removeAttribute("hidden");
                } else {
                    pane.setAttribute("hidden", "hidden");
                }
            });
            return;
        }
        var openModalBtn = e.target.closest ? e.target.closest("[data-invoisys-ds-modal-open]") : null;
        if (openModalBtn) {
            e.preventDefault();
            var modalId = openModalBtn.getAttribute("data-invoisys-ds-modal-open");
            var modalEl = modalId ? document.getElementById(modalId) : null;
            if (modalEl && modalEl.hasAttribute("data-invoisys-ds-modal-demo")) {
                document.querySelectorAll("[data-invoisys-ds-modal-demo]:not([hidden])").forEach(function (m) {
                    m.hidden = true;
                    m.setAttribute("aria-hidden", "true");
                });
                modalEl.hidden = false;
                modalEl.setAttribute("aria-hidden", "false");
                document.body.style.overflow = "hidden";
                var dlg = modalEl.querySelector('[role="dialog"]');
                var focusable = dlg
                    ? dlg.querySelector(
                          'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                      )
                    : null;
                if (focusable) {
                    focusable.focus();
                }
            }
            return;
        }
        var closeModalEl = e.target.closest ? e.target.closest("[data-invoisys-ds-modal-close]") : null;
        if (closeModalEl) {
            var modalRoot = closeModalEl.closest("[data-invoisys-ds-modal-demo]");
            if (modalRoot) {
                e.preventDefault();
                modalRoot.hidden = true;
                modalRoot.setAttribute("aria-hidden", "true");
                var stillOpen = document.querySelector("[data-invoisys-ds-modal-demo]:not([hidden])");
                document.body.style.overflow = stillOpen ? "hidden" : "";
                return;
            }
        }
        var toggle = e.target.closest ? e.target.closest("[data-invoisys-ds-dropdown-toggle]") : null;
        if (toggle) {
            e.preventDefault();
            var root = toggle.closest("[data-invoisys-ds-dropdown]");
            if (!root) {
                return;
            }
            var wasOpen = root.classList.contains("invoisys-ds-dropdown--open");
            document.querySelectorAll("[data-invoisys-ds-dropdown].invoisys-ds-dropdown--open").forEach(function (r) {
                r.classList.remove("invoisys-ds-dropdown--open");
                var tg = r.querySelector("[data-invoisys-ds-dropdown-toggle]");
                if (tg) {
                    tg.setAttribute("aria-expanded", "false");
                }
            });
            if (!wasOpen) {
                root.classList.add("invoisys-ds-dropdown--open");
                toggle.setAttribute("aria-expanded", "true");
            }
            return;
        }
        var menuItem = e.target.closest ? e.target.closest(".invoisys-ds-dropdown-item") : null;
        if (menuItem) {
            var rootItem = menuItem.closest("[data-invoisys-ds-dropdown]");
            if (rootItem) {
                rootItem.classList.remove("invoisys-ds-dropdown--open");
                var tgi = rootItem.querySelector("[data-invoisys-ds-dropdown-toggle]");
                if (tgi) {
                    tgi.setAttribute("aria-expanded", "false");
                }
            }
            return;
        }
        if (e.target.closest && e.target.closest("[data-invoisys-ds-dropdown]")) {
            return;
        }
        document.querySelectorAll("[data-invoisys-ds-dropdown].invoisys-ds-dropdown--open").forEach(function (r) {
            r.classList.remove("invoisys-ds-dropdown--open");
            var tg = r.querySelector("[data-invoisys-ds-dropdown-toggle]");
            if (tg) {
                tg.setAttribute("aria-expanded", "false");
            }
        });
    });

    document.querySelectorAll("[data-ds-copy]").forEach(function (copyBtn) {
        copyBtn.addEventListener("click", function () {
            var targetId = copyBtn.getAttribute("data-ds-copy");
            var pre = document.getElementById(targetId);
            if (!pre) return;
            var text = pre.textContent || "";
            function feedback(ok) {
                var label = copyBtn.querySelector(".invoisys-ds-copy-label");
                if (!label) return;
                var prev = label.textContent;
                label.textContent = ok ? "Copiado!" : "Erro";
                setTimeout(function () {
                    label.textContent = prev;
                }, 1600);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    feedback(true);
                }).catch(function () {
                    feedback(false);
                });
            } else {
                try {
                    var ta = document.createElement("textarea");
                    ta.value = text;
                    ta.style.position = "fixed";
                    ta.style.left = "-9999px";
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    document.body.removeChild(ta);
                    feedback(true);
                } catch (e) {
                    feedback(false);
                }
            }
        });
    });

    function navTargetExists(id) {
        return Array.prototype.some.call(navButtons, function (b) {
            return b.getAttribute("data-ds-target") === id;
        });
    }

    function initFromHash() {
        var raw = (location.hash || "").replace(/^#/, "");
        navigateToFragment(raw, { skipReplaceHash: true, smooth: false, fixInvalidHash: true });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") {
            return;
        }
        var openModal = document.querySelector(".invoisys-ds-doc [data-invoisys-ds-modal-demo]:not([hidden])");
        if (!openModal) {
            return;
        }
        openModal.hidden = true;
        openModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    });

    document.addEventListener("change", function (e) {
        if (!e.target) {
            return;
        }
        if (e.target.id === "ds-demo-arquivo-xml") {
            var path = e.target.value ? e.target.value.split(/[/\\]/).pop() : "";
            var tx = document.getElementById("ds-demo-uploader-xml");
            if (tx) {
                tx.value = path || "";
            }
            return;
        }
        if (e.target.id === "ds-inputs-xml-file") {
            var nm = document.getElementById("ds-inputs-xml-name");
            if (nm) {
                nm.value = e.target.files && e.target.files[0] ? e.target.files[0].name : "";
            }
            return;
        }
        if (e.target.id === "ds-form-anexo-file") {
            var an = document.getElementById("ds-form-anexo-name");
            if (an) {
                an.value = e.target.files && e.target.files[0] ? e.target.files[0].name : "";
            }
        }
    });

    window.addEventListener("hashchange", initFromHash);
    window.addEventListener("scroll", onScroll, { passive: true });

    window.addEventListener("message", function (ev) {
        var d = ev.data;
        if (!d || d.source !== "invoisys-ds-embed-height" || typeof d.height !== "number") {
            return;
        }
        if (!ev.source || !ev.source.frameElement) {
            return;
        }
        var frame = ev.source.frameElement;
        if (!frame.classList || !frame.classList.contains("invoisys-ds-demo-iframe")) {
            return;
        }
        var px = Math.ceil(Math.min(Math.max(d.height + 8, 140), 900));
        frame.style.height = px + "px";
    });

    initFromHash();
})();
