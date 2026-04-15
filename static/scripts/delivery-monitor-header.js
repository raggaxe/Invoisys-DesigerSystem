/**
 * Delivery Monitor — cabeçalho da grid (Views/DeliveryMonitor).
 * Intervalo de datas, painel de totalizadores, Filtrar por.
 * Comportamento partilhado da grid: Scripts/Tabelas/table-setting.js (startTable, invTableUi).
 */
(function ($) {
    'use strict';

    var dmGridReloadDebounceTimer = null;
    var dmMetricsRefreshDebounceTimer = null;
    var dmMetricsFetchSeq = 0;
    /**
     * Ciclo para gravar data/hora no tooltip do botão Atualizar: só após draw.dt da grid
     * e conclusão do POST de totalizadores (último seq). Ativado na 1.ª abertura e em cada clique no botão.
     * stampPending: aguardando os dois lados; drawComplete / metricsComplete: já concluídos neste ciclo.
     */
    var dmFullRefreshStamp = { stampPending: false, drawComplete: false, metricsComplete: false };

    /** Alinhado a `data-table` no #dmDeliveryMonitorRoot e a table-init.js (`getDeliveryMonitorTableLookup`). */
    function dmDeliveryMonitorTableLookup() {
        if (typeof window.getDeliveryMonitorTableLookup === 'function') {
            return window.getDeliveryMonitorTableLookup();
        }
        var $r = $('#dmDeliveryMonitorRoot');
        var v = ($r.attr('data-table') || '').trim();
        if (!v) {
            return '#tblDeliveryMonitor';
        }
        return v.charAt(0) === '#' ? v : '#' + v;
    }

    function beginDmFullRefreshStampCycle() {
        dmFullRefreshStamp = { stampPending: true, drawComplete: false, metricsComplete: false };
    }

    function abortDmFullRefreshStampCycle() {
        if (dmFullRefreshStamp.stampPending) {
            dmFullRefreshStamp.stampPending = false;
        }
    }

    function tryCompleteDmFullRefreshStamp() {
        if (!dmFullRefreshStamp.stampPending || !dmFullRefreshStamp.drawComplete || !dmFullRefreshStamp.metricsComplete) {
            return;
        }
        dmFullRefreshStamp.stampPending = false;
        updateDeliveryMonitorRefreshButtonTooltip(new Date());
    }

    function onDmDrawDtForFullRefreshStamp() {
        if (!dmFullRefreshStamp.stampPending || dmFullRefreshStamp.drawComplete) {
            return;
        }
        dmFullRefreshStamp.drawComplete = true;
        tryCompleteDmFullRefreshStamp();
    }

    function onDmMetricsAjaxDoneForFullRefreshStamp(seq) {
        if (!dmFullRefreshStamp.stampPending || dmFullRefreshStamp.metricsComplete) {
            return;
        }
        if (seq !== dmMetricsFetchSeq) {
            return;
        }
        dmFullRefreshStamp.metricsComplete = true;
        tryCompleteDmFullRefreshStamp();
    }

    /**
     * Aplicar filtros (layout NFe Entrada): quando existir API, recarregar dados; por agora redesenha a grid.
     * Debounce evita 2º draw na abertura (ex.: Select2/empresas + 1º carregamento da grid no mesmo instante).
     */
    function reloadTblDeliveryMonitor() {
        window.clearTimeout(dmGridReloadDebounceTimer);
        dmGridReloadDebounceTimer = window.setTimeout(function () {
            try {
                if ($.fn.dataTable && $.fn.dataTable.isDataTable(dmDeliveryMonitorTableLookup())) {
                    $(dmDeliveryMonitorTableLookup()).DataTable().draw(false);
                } else {
                    abortDmFullRefreshStampCycle();
                }
            } catch (err) {
                abortDmFullRefreshStampCycle();
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('DeliveryMonitor: reloadTblDeliveryMonitor', err);
                }
            }
            scheduleDeliveryMonitorMetricsRefresh();
        }, 120);
    }
    window.reloadTblDeliveryMonitor = reloadTblDeliveryMonitor;

    function formatDeliveryMonitorPctLabel(rawPct) {
        if (rawPct == null || rawPct === '' || (typeof rawPct === 'number' && isNaN(rawPct))) {
            return '0%';
        }
        var numeric = Number(rawPct);
        if (isNaN(numeric)) {
            return '0%';
        }
        var rounded = Math.round(numeric * 10) / 10;
        var formatted =
            Math.abs(rounded - Math.round(rounded)) < 1e-6
                ? String(Math.round(rounded))
                : rounded.toFixed(1).replace('.', ',');
        return formatted + '%';
    }

    /**
     * Select2 esconde o select nativo e renderiza .select2-container ao lado — Playwright deve usar este data-testid no container.
     */
    function tagDeliveryMonitorSelect2Container($select, testId) {
        if (!$select || !$select.length || !testId) {
            return;
        }
        window.setTimeout(function () {
            var $c = $select.next('.select2-container');
            if ($c.length) {
                $c.attr('data-testid', testId);
            }
        }, 0);
    }

    /** Template Bootstrap 3 alinhado a layout.css (borda/texto #4FB73B) — toolbar, filtros Select2, células da grid. */
    function dmToolbarHintTooltipTemplate() {
        return (
            '<div class="tooltip dm-toolbar-hint-tooltip" role="tooltip">' +
            '<div class="tooltip-arrow"></div>' +
            '<div class="tooltip-inner"></div>' +
            '</div>'
        );
    }

    /**
     * Reinicializa tooltip Bootstrap com o cartão verde (.dm-toolbar-hint-tooltip).
     * Não usar em .dm-tooltip-chave-nfe (template largo para chave 44 dígitos).
     */
    function applyDeliveryMonitorToolbarHintTooltip($t) {
        if (!$t || !$t.length || typeof $.fn.tooltip !== 'function' || !$t.is('[data-toggle="tooltip"]')) {
            return;
        }
        if ($t.hasClass('dm-tooltip-chave-nfe')) {
            return;
        }
        if ($t.data('bs.tooltip')) {
            try {
                $t.tooltip('destroy');
            } catch (e1) {
                /* ignore */
            }
        }
        var trig = ($t.attr('data-trigger') || 'hover focus').trim();
        var opts = {
            container: 'body',
            trigger: trig,
            template: dmToolbarHintTooltipTemplate(),
            delay: { show: 200, hide: 80 }
        };
        if ($t.attr('data-placement')) {
            opts.placement = $t.attr('data-placement');
        }
        $t.tooltip(opts);
    }

    /** Tooltip no .select2-selection (o &lt;select&gt; fica oculto). */
    function wireDeliveryMonitorSelect2Hint($select, cfg) {
        if (!$select || !$select.length || typeof $.fn.tooltip !== 'function') {
            return;
        }
        var placement = cfg && cfg.placement ? String(cfg.placement) : 'top';
        var titleText = cfg && cfg.title != null ? String(cfg.title) : '';
        if (!titleText) {
            return;
        }
        var $s2 = $select.next('.select2-container');
        if (!$s2.length) {
            return;
        }
        var $target = $s2.find('.select2-selection').first();
        if (!$target.length) {
            $target = $s2;
        }
        if ($target.data('bs.tooltip')) {
            try {
                $target.tooltip('destroy');
            } catch (e0) {
                /* ignore */
            }
        }
        $target.removeAttr('title');
        $s2.removeAttr('title');
        $target.tooltip({
            container: 'body',
            trigger: 'hover',
            placement: placement,
            delay: { show: 220, hide: 80 },
            template: dmToolbarHintTooltipTemplate(),
            title: titleText
        });
    }

    function wireDeliveryMonitorEmpresaSelectTooltip() {
        wireDeliveryMonitorSelect2Hint($('#dmEmpresaId'), {
            placement: 'top',
            title:
                'Selecione a empresa para filtrar a listagem. Em «Todas as Empresas» não se aplica filtro por empresa.'
        });
    }

    function wireDeliveryMonitorFilterSelect2Tooltips() {
        wireDeliveryMonitorSelect2Hint($('#dmFilterCategoria'), {
            placement: 'top',
            title:
                'Filtra por uma ou mais categorias. Sem seleção, são consideradas todas as categorias.'
        });
        wireDeliveryMonitorSelect2Hint($('#dmFilterStatus'), {
            placement: 'top',
            title: 'Filtra pelos estados de entrega disponíveis na API.'
        });
    }

    window.dmToolbarHintTooltipTemplate = dmToolbarHintTooltipTemplate;
    window.applyDeliveryMonitorToolbarHintTooltip = applyDeliveryMonitorToolbarHintTooltip;

    function setDeliveryMonitorMetricsBoxesLoading(isLoading) {
        var $panel = $('#dm_totalizadora_panel');
        $panel.find('.dm-totalizadores-metrics > .metrics-box').toggleClass('dm-metric-box--loading', !!isLoading);
        $panel.attr('aria-busy', isLoading ? 'true' : 'false');
    }

    function parseDeliveryMonitorMetricCount(raw) {
        var parsed = parseInt(raw, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    function applyDeliveryMonitorTotalizadoresToDom(data) {
        if (!data || typeof data !== 'object') {
            return;
        }
        $('#dm-metric-transito').text(parseDeliveryMonitorMetricCount(data.emTransito));
        $('#dm-pct-transito').text(formatDeliveryMonitorPctLabel(data.porcentagemEmTransito));
        $('#dm-metric-entrega').text(parseDeliveryMonitorMetricCount(data.entregaRealizada));
        $('#dm-pct-entrega').text(formatDeliveryMonitorPctLabel(data.porcentagemEntregaRealizada));
        $('#dm-metric-atraso').text(parseDeliveryMonitorMetricCount(data.emAtraso));
        $('#dm-pct-atraso').text(formatDeliveryMonitorPctLabel(data.porcentagemEmAtraso));
        $('#dm-metric-nao-entregue').text(parseDeliveryMonitorMetricCount(data.naoEntregue));
        $('#dm-pct-nao-entregue').text(formatDeliveryMonitorPctLabel(data.porcentagemNaoEntregue));
        $('#dm-metric-enviado-destino').text(parseDeliveryMonitorMetricCount(data.enviadoSistemaDestino));
        $('#dm-metric-recebido-destino').text(parseDeliveryMonitorMetricCount(data.recebidoSistemaDestino));
    }

    function fetchDeliveryMonitorTotalizadores() {
        var $root = $('#dmDeliveryMonitorRoot');
        var url = $root.data('dm-totalizar-url');
        if (!url || typeof window.getDeliveryMonitorDadosFiltros !== 'function') {
            if (dmFullRefreshStamp.stampPending && !dmFullRefreshStamp.metricsComplete) {
                dmFullRefreshStamp.metricsComplete = true;
                tryCompleteDmFullRefreshStamp();
            }
            return;
        }
        var seq = ++dmMetricsFetchSeq;
        setDeliveryMonitorMetricsBoxesLoading(true);
        $.ajax({
            url: url,
            type: 'POST',
            data: window.getDeliveryMonitorDadosFiltros(),
            dataType: 'json',
            traditional: true
        })
            .done(function (res) {
                applyDeliveryMonitorTotalizadoresToDom(res);
            })
            .fail(function (jqXHR, textStatus) {
                if (textStatus === 'abort') {
                    return;
                }
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('DeliveryMonitor: totalizar falhou', jqXHR.status, jqXHR.statusText);
                }
            })
            .always(function (_arg, textStatus) {
                if (textStatus === 'abort') {
                    return;
                }
                if (seq === dmMetricsFetchSeq) {
                    setDeliveryMonitorMetricsBoxesLoading(false);
                }
                onDmMetricsAjaxDoneForFullRefreshStamp(seq);
            });
    }

    function scheduleDeliveryMonitorMetricsRefresh() {
        window.clearTimeout(dmMetricsRefreshDebounceTimer);
        dmMetricsRefreshDebounceTimer = window.setTimeout(fetchDeliveryMonitorTotalizadores, 200);
    }

    /**
     * Liga mudanças de filtro → draw() só após table-init disparar deliveryMonitor:dataTableReady.
     * Evita draw() durante o primeiro init do DataTables (quebrava loading/tabela no table-setting.js).
     */
    function bindDeliveryMonitorReloadAfterGridReady() {
        $(document).one('deliveryMonitor:dataTableReady', function () {
            beginDmFullRefreshStampCycle();
            scheduleDeliveryMonitorMetricsRefresh();
            $(dmDeliveryMonitorTableLookup()).on('draw.dt.dmFullRefreshStamp', onDmDrawDtForFullRefreshStamp);
            $('#dmDateRange').on('apply.daterangepicker.dmReloadGrid', reloadTblDeliveryMonitor);
            $('#dmEmpresaId').on('change.dmReloadGrid select2:select.dmReloadGrid', reloadTblDeliveryMonitor);
            $('#checkIncluirFiliais')
                .off('change.dmReloadGrid')
                .on('change.dmReloadGrid', function () {
                    var empresaVal = $('#dmEmpresaId').val();
                    if (empresaVal && empresaVal !== '0') {
                        reloadTblDeliveryMonitor();
                    }
                });
            $(document)
                .off('click.dmAplicarFiltros', '#dmBtnAplicarFiltros')
                .on('click.dmAplicarFiltros', '#dmBtnAplicarFiltros', function (e) {
                    e.preventDefault();
                    reloadTblDeliveryMonitor();
                    closeDeliveryMonitorFiltersPanel(true);
                });
        });
    }

    /**
     * Só dígitos: 14 = CNPJ, 11 = CPF — envia em cnpj*; caso contrário nome*.
     */
    function classifyDmDocOuNome(raw) {
      
        if (raw === null || raw === undefined) {
            return {};
        }
        var textoTrim = String(raw).trim();
        if (!textoTrim) {
            return {};
        }
        var digits = textoTrim.replace(/\D/g, '');
        var onlyMask = /^\s*[\d.\-/\s]+\s*$/.test(textoTrim);
        if (onlyMask && (digits.length === 14 || digits.length === 11)) {
            return { doc: digits };
        }
        if (/^\d+$/.test(digits) && textoTrim.indexOf(' ') === -1 && (digits.length === 14 || digits.length === 11)) {
            return { doc: digits };
        }
        return { nome: textoTrim };
    }

    /**
     * Intervalo &quot;DD/MM/YYYY - DD/MM/YYYY&quot; → ISO UTC (início do 1º dia, fim do 2º).
     */
    function parseDmDateRangeToUtcIsoPair(displayVal) {
        if (!displayVal || typeof moment === 'undefined') {
            return null;
        }
        var parts = String(displayVal).split(/\s*-\s*/);
        if (parts.length < 2) {
            return null;
        }
        var m1 = moment(parts[0].trim(), 'DD/MM/YYYY', true);
        var m2 = moment(parts[1].trim(), 'DD/MM/YYYY', true);
        if (!m1.isValid() || !m2.isValid()) {
            return null;
        }
        return {
            de: m1.clone().startOf('day').format('YYYY-MM-DD[T]HH:mm:ss.SSS'),
            ate: m2.clone().endOf('day').format('YYYY-MM-DD[T]HH:mm:ss.SSS')
        };
    }

    /**
     * Primeiro dia do intervalo de emissão (#dmDateRange), hora local — base para minDate em entrega/recusa.
     */
    function getDmEmissaoRangeStartMomentLocal() {
        if (typeof moment === 'undefined') {
            return null;
        }
        var v = $('#dmDateRange').val();
        if (!v || !String(v).trim()) {
            return null;
        }
        var parts = String(v).split(/\s*-\s*/);
        if (parts.length < 2) {
            return null;
        }
        var m1 = moment(parts[0].trim(), 'DD/MM/YYYY', true);
        if (!m1.isValid()) {
            return null;
        }
        return m1.clone().startOf('day');
    }

    /**
     * Data entrega / Data recusa: início do intervalo não antes da data inicial de emissão; sem limite de data final.
     */
    function syncDmEntregaRecusaMinDateFromEmissao() {
        var minM = getDmEmissaoRangeStartMomentLocal();
        $('#dmFilterDataEntrega, #dmFilterDataRecusa').each(function () {
            var drp = $(this).data('daterangepicker');
            if (!drp) {
                return;
            }
            drp.minDate = minM ? minM.clone() : false;
            drp.maxDate = false;
            if (minM && drp.startDate && typeof drp.startDate.isBefore === 'function') {
                if (drp.startDate.isBefore(minM, 'day')) {
                    drp.setStartDate(minM.clone());
                }
                if (drp.endDate && typeof drp.endDate.isBefore === 'function') {
                    if (drp.endDate.isBefore(minM, 'day')) {
                        drp.setEndDate(minM.clone());
                    }
                    if (drp.startDate && drp.endDate.isBefore(drp.startDate, 'day')) {
                        drp.setEndDate(drp.startDate.clone());
                    }
                }
            }
            if (!drp.isShowing) {
                drp.updateElement();
            }
            // updateCalendars() assume leftCalendar.month já definido; só após show/set* ou updateMonthsInView (bootstrap-daterangepicker v2).
            if (typeof drp.updateMonthsInView === 'function') {
                drp.updateMonthsInView();
            }
            if (drp.leftCalendar && drp.leftCalendar.month && drp.rightCalendar && drp.rightCalendar.month
                && typeof drp.updateCalendars === 'function') {
                drp.updateCalendars();
            }
        });
    }

    /**
     * Categorias multiselect: o &lt;option value&gt; continua a ser o código (lookup); o filtro envia só os nomes
     * exibidos, para a API/DTO (evita duplicar o mesmo nome quando há dois códigos com o mesmo rótulo).
     */
    function getDeliveryMonitorSelectedCategoriaNomes() {
        var $cat = $('#dmFilterCategoria');
        if (!$cat.length) {
            return [];
        }
        var raw = $cat.val();
        if (raw == null || raw === '') {
            return [];
        }
        var codigos = $.isArray(raw) ? raw.slice() : [raw];
        var seenNorm = {};
        var nomes = [];
        for (var ci = 0; ci < codigos.length; ci++) {
            var cod = codigos[ci];
            if (cod == null || cod === '') {
                continue;
            }
            var codStr = String(cod);
            var $opt = $cat
                .find('option')
                .filter(function () {
                    return String($(this).val()) === codStr;
                })
                .first();
            if (!$opt.length) {
                continue;
            }
            var nome = ($opt.text() || '').trim();
            if (!nome) {
                continue;
            }
            var norm = nome.toLowerCase();
            if (seenNorm[norm]) {
                continue;
            }
            seenNorm[norm] = true;
            nomes.push(nome);
        }
        return nomes;
    }

    /**
     * Filtros do painel — mesmo papel que <c>dadosFiltros</c> em FaturaEntrada / GetDataPaginated (DTO separado dos parâmetros DataTables).
     */
    function getDeliveryMonitorDadosFiltros() {
        var extras = {};
        var emissao = parseDmDateRangeToUtcIsoPair($('#dmDateRange').val());
        if (emissao) {
            extras.dtEmissaoDe = emissao.de;
            extras.dtEmissaoAte = emissao.ate;
        }
        var empresaVal = $('#dmEmpresaId').val();
        extras.empresaId = empresaVal ? parseInt(empresaVal, 10) : 0;
        var destinatarioDocOuNome = classifyDmDocOuNome($('#dmFilterDestinatario').val());
        if (destinatarioDocOuNome.doc) {
            extras.cnpjDestinatario = destinatarioDocOuNome.doc;
        } else if (destinatarioDocOuNome.nome) {
            extras.nomeDestinatario = destinatarioDocOuNome.nome;
        }
        var transportadoraDocOuNome = classifyDmDocOuNome($('#dmFilterTransportadora').val());
        if (transportadoraDocOuNome.doc) {
            extras.cnpjTransportador = transportadoraDocOuNome.doc;
        } else if (transportadoraDocOuNome.nome) {
            extras.nomeTransportador = transportadoraDocOuNome.nome;
        }
        var statusFiltroVal = $('#dmFilterStatus').val();
        extras.status = statusFiltroVal ? parseInt(statusFiltroVal, 10) : 0;
        extras.incluirFiliais =
            $('#checkIncluirFiliais').is(':checked') && empresaVal && empresaVal !== '0';
        var entrega = parseDmDateRangeToUtcIsoPair($('#dmFilterDataEntrega').val());
        if (entrega) {
            extras.dataEntregaDe = entrega.de;
            extras.dataEntregaAte = entrega.ate;
        }
        var recusa = parseDmDateRangeToUtcIsoPair($('#dmFilterDataRecusa').val());
        if (recusa) {
            extras.dataRecusaDe = recusa.de;
            extras.dataRecusaAte = recusa.ate;
        }
        extras.categoriaJson = JSON.stringify(getDeliveryMonitorSelectedCategoriaNomes());
        return extras;
    }
    window.getDeliveryMonitorDadosFiltros = getDeliveryMonitorDadosFiltros;
    window.getDeliveryMonitorGridExtras = getDeliveryMonitorDadosFiltros;

    /**
     * Limpar campos do painel &quot;Filtrar por&quot; (valores padrão até as rotas de lookup existirem).
     */
    function limparFiltrosDeliveryMonitor() {
        $('#dmFilterDestinatario, #dmFilterTransportadora').val('').trigger('input.dmDocNome');
        var $cat = $('#dmFilterCategoria');
        $cat.val(null);
        if ($cat.hasClass('select2-hidden-accessible')) {
            $cat.trigger('change.select2');
        } else {
            $cat.trigger('change');
        }
        $('#dmFilterStatus').each(function () {
            var $s = $(this);
            $s.val('0');
            if ($s.hasClass('select2-hidden-accessible')) {
                $s.trigger('change.select2');
            } else {
                $s.trigger('change');
            }
        });
        clearDmFilterDateRange('entrega');
        clearDmFilterDateRange('recusa');
    }
    window.limparFiltrosDeliveryMonitor = limparFiltrosDeliveryMonitor;

    /**
     * Limpa um intervalo de filtro (entrega | recusa). Usado pelo X e por &quot;Limpar filtros&quot;.
     */
    function clearDmFilterDateRange(which) {
        var rangeInputSelector = which === 'recusa' ? '#dmFilterDataRecusa' : '#dmFilterDataEntrega';
        var $el = $(rangeInputSelector);
        if (!$el.length) {
            return false;
        }
        $el.val('');
        var drp = $el.data('daterangepicker');
        if (drp && typeof moment !== 'undefined') {
            drp.setStartDate(moment());
            drp.setEndDate(moment());
        }
        return false;
    }
    window.clearDmFilterDateRange = clearDmFilterDateRange;

    /** Ao escolher intervalo num campo, o outro fica sempre vazio (no máximo um preenchido). */
    function clearOtherFilterDateRange($activeInput) {
        var isEntrega = $activeInput.attr('id') === 'dmFilterDataEntrega';
        clearDmFilterDateRange(isEntrega ? 'recusa' : 'entrega');
    }

    function initDateRange() {
        if (!$('#dmDateRange').length || typeof $.fn.daterangepicker !== 'function' || typeof moment === 'undefined') {
            return;
        }

        /* dateLimit (daterangepicker v2): intervalo máximo entre início e fim — ex.: 13/03 → fim no máximo 13/03 + 31 dias */
        $('#dmDateRange').daterangepicker({
            showDropdowns: false,
            autoApply: true,
            showCustomRangeLabel: false,
            linkedCalendars: true,
            autoUpdateInput: false,
            dateLimit: { days: 31 },
            startDate: moment(),
            endDate: moment(),
            ranges: {
                'Ontem': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                'Hoje': [moment(), moment()],
                'Semana Atual': [moment().startOf('week'), moment().endOf('week')],
                'Mês Atual': [moment().startOf('month'), moment().endOf('month')],
                'Semana Passada': [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
                'Mês Passado': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
            },
            locale: {
                format: 'DD/MM/YYYY',
                separator: ' - ',
                applyLabel: 'Aplicar',
                cancelLabel: 'Limpar',
                fromLabel: 'De: ',
                toLabel: 'Até: ',
                customRangeLabel: 'Data Específica',
                weekLabel: 'Sem.',
                daysOfWeek: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
                firstDay: 0
            },
            alwaysShowCalendars: true
        });

        var $dmRange = $('#dmDateRange');
        var hoje = moment();
        $dmRange.val(hoje.format('DD/MM/YYYY') + ' - ' + hoje.format('DD/MM/YYYY'));

        $('#dmDateRange').on('apply.daterangepicker.dmHeaderRange', function (e, picker) {
            $(this).val(
                picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY')
            );
        });

        $('#dmDateRange').on('apply.daterangepicker.dmEntregaRecusaBounds', function () {
            window.setTimeout(syncDmEntregaRecusaMinDateFromEmissao, 0);
        });

        $('#dmDateRange').on('show.daterangepicker.dmHeaderRange', function () {
            if ($('body').hasClass('sidebar-collapsed') && $('body').hasClass('sidebar-show')) {
                $('body').removeClass('sidebar-collapsed');
            }
            if ($('body').hasClass('sidebar-show')) {
                $('body').removeClass('sidebar-show');
                $('.daterangepicker').css({ left: '40px', right: 'auto' });
            }
        });
    }

    function formatDeliveryMonitorLastRefreshLabel(d) {
        if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
            return '—';
        }
        if (typeof window.moment === 'function') {
            return window.moment(d).format('DD/MM/YYYY HH:mm:ss');
        }
        function z(n) {
            return n < 10 ? '0' + n : String(n);
        }
        return (
            z(d.getDate()) +
            '/' +
            z(d.getMonth() + 1) +
            '/' +
            d.getFullYear() +
            ' ' +
            z(d.getHours()) +
            ':' +
            z(d.getMinutes()) +
            ':' +
            z(d.getSeconds())
        );
    }

    /** Atualiza título / tooltip do botão &quot;Atualizar&quot; com a última data/hora de refresh pela toolbar. */
    function updateDeliveryMonitorRefreshButtonTooltip(lastDate) {
        var $btn = $('#dmBtnAtualizarDados');
        if (!$btn.length) {
            return;
        }
        var base = 'Atualizar tabela e totalizadores com os filtros atuais.';
        var full = base + ' Última atualização: ' + formatDeliveryMonitorLastRefreshLabel(lastDate);
        $btn.attr('aria-label', full).attr('data-original-title', full).removeAttr('title');
        if ($btn.data('bs.tooltip')) {
            try {
                $btn.tooltip('destroy');
            } catch (eTip) {
                /* ignore */
            }
        }
        applyDeliveryMonitorToolbarHintTooltip($btn);
    }

    /** Recarrega dados no servidor (mesmos filtros) + totalizadores. */
    function initDeliveryMonitorRefreshButton() {
        $('#dmBtnAtualizarDados')
            .off('click.dmAtualizar')
            .on('click.dmAtualizar', function () {
                var $btn = $(this);
                if ($btn.data('bs.tooltip')) {
                    $btn.tooltip('hide');
                }
                $btn.blur();
                beginDmFullRefreshStampCycle();
                reloadTblDeliveryMonitor();
            });
    }

    function initMetricPanelToggles() {
        var $main = $('#dm_main_panel');
        var $toggleBtn = $('#dmBtnMostrarPainel');

        $toggleBtn.on('click', function (e) {
            e.preventDefault();
            var $btn = $(this);
            if ($btn.data('bs.tooltip')) {
                $btn.tooltip('hide');
            }
            $btn.blur();
            var $label = $btn.find('.dm-btn-label');
            var $icon = $btn.find('.dm-btn-icon');
            if ($btn.hasClass('active')) {
                $main.hide().attr('aria-hidden', 'true');
                $btn.removeClass('active');
                $label.text('Mostrar Painel');
                $icon.removeClass('fa-eye-slash').addClass('fa-eye');
            } else {
                $main.show().attr('aria-hidden', 'false');
                $btn.addClass('active');
                $label.text('Ocultar Painel');
                $icon.removeClass('fa-eye').addClass('fa-eye-slash');
            }
            var tipPainel = $btn.hasClass('active')
                ? 'Ocultar o painel de totalizadores.'
                : 'Exibir ou ocultar o painel de totalizadores.';
            $btn.attr('data-original-title', tipPainel).attr('aria-label', tipPainel.replace(/\.$/, '')).removeAttr('title');
            applyDeliveryMonitorToolbarHintTooltip($btn);
            window.setTimeout(function () {
                $(document).trigger('deliveryMonitor:recalcPageLength');
            }, 0);
        });
    }

    /** Value &quot;0&quot; = Todas as Empresas: esconde switch e força &quot;Não&quot; no filtro. */
    function syncDmIncluirFiliaisVisibility() {
        var $wrap = $('#dmIncluirFiliaisWrap');
        var $cb = $('#checkIncluirFiliais');
        var $emp = $('#dmEmpresaId');
        if (!$wrap.length || !$emp.length) {
            return;
        }
        var empresaSelecionadaVal = $emp.val();
        var isTodas =
            empresaSelecionadaVal === '0' ||
            empresaSelecionadaVal === '' ||
            empresaSelecionadaVal === null ||
            typeof empresaSelecionadaVal === 'undefined';
        if (isTodas) {
            $cb.prop('checked', false).prop('disabled', true);
            $wrap.attr('aria-hidden', 'true').addClass('dm-incluir-filial-wrap--hidden');
        } else {
            $cb.prop('disabled', false);
            $wrap.removeAttr('aria-hidden').removeClass('dm-incluir-filial-wrap--hidden');
        }
    }

    /**
     * Select2 igual ao restante do portal, mas sem o init global (plugins.js) que usa placeholder vazio
     * e quebra opção &quot;todas&quot;. Value &quot;0&quot; = todas as empresas.
     */
    function initDeliveryMonitorEmpresaSelect() {
        var $el = $('#dmEmpresaId');
        if (!$el.length || typeof $.fn.select2 !== 'function') {
            return;
        }
        if ($el.hasClass('select2-hidden-accessible')) {
            $el.select2('destroy');
        }
        $el.select2({
            language: 'pt-BR',
            width: '100%',
            allowClear: false,
            minimumResultsForSearch: 0,
            dropdownCssClass: $el.data('style') || '',
            containerCssClass: $el.data('container-class') || ''
        });
        tagDeliveryMonitorSelect2Container($el, 'deliverymonitor-select2-empresa');
        $el.off('change.dmIncluirFiliais select2:select.dmIncluirFiliais').on(
            'change.dmIncluirFiliais select2:select.dmIncluirFiliais',
            syncDmIncluirFiliaisVisibility
        );
        syncDmIncluirFiliaisVisibility();
        window.setTimeout(wireDeliveryMonitorEmpresaSelectTooltip, 0);
    }

    /**
     * Preenche o select de empresas após o HTML (Index já não bloqueia em GET /api/empresa).
     * A grid pode iniciar com &quot;Todas&quot; (0) enquanto a lista carrega.
     */
    function loadDeliveryMonitorEmpresasThenInitSelect() {
        var $root = $('#dmDeliveryMonitorRoot');
        var url = $root.data('dm-empresas-url');
        var $el = $('#dmEmpresaId');
        var $wrap = $el.closest('.dm-empresa-select-wrap');
        if (!$el.length) {
            return;
        }
        if (!url) {
            initDeliveryMonitorEmpresaSelect();
            return;
        }
        $wrap.addClass('dm-empresa-select-wrap--loading').attr({
            'aria-busy': 'true',
            'aria-label': 'Carregando lista de empresas'
        });
        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            cache: true
        })
            .done(function (res) {
                var list = res && $.isArray(res.items) ? res.items : [];
                var previous = $el.val();
                $el.empty();
                $.each(list, function (_i, it) {
                    if (!it || it.value === undefined || it.text === undefined) {
                        return;
                    }
                    var opt = $('<option></option>').attr('value', String(it.value)).text(String(it.text));
                    if (String(it.value) === '0') {
                        opt.prop('selected', true);
                    }
                    $el.append(opt);
                });
                if ($el.find('option').length === 0) {
                    $el.append($('<option></option>').attr('value', '0').text('Todas as Empresas').prop('selected', true));
                } else if (previous && $el.find('option[value="' + previous + '"]').length) {
                    $el.val(previous);
                }
                initDeliveryMonitorEmpresaSelect();
            })
            .fail(function () {
                initDeliveryMonitorEmpresaSelect();
            })
            .always(function () {
                $wrap.removeClass('dm-empresa-select-wrap--loading');
                $wrap.removeAttr('aria-busy');
                $wrap.removeAttr('aria-label');
            });
    }

    /**
     * Select2 nos filtros (Categoria, Status): mesma base do campo Empresa.
     * Value &quot;0&quot; = Todos até existir API para preencher opções. Transportadora é input texto.
     * Init na primeira abertura do painel — o painel nasce oculto e o Select2 precisa de largura real.
     */
    var dmFilterPanelWidgetsInitialized = false;
    var dmFilterLookupsLoaded = false;
    var dmFilterLookupsLoading = false;

    var DM_FILTRAR_POR_LOADING_CLS = 'dm-filtrar-por-wrap--loading';

    function deliveryMonitorHasFilterLookupUrls() {
        var $root = $('#dmDeliveryMonitorRoot');
        if (!$root.length) {
            return false;
        }
        return !!($root.data('dm-filtros-status-url') || $root.data('dm-filtros-categoria-url'));
    }

    /**
     * Mesmo padrão visual do select de empresas (loading-pulse em table.css): até Status/Categoria estarem carregados.
     */
    function syncDmFiltrarPorLoadingUI() {
        var $wrap = $('#dmWrapFiltrarPor');
        if (!$wrap.length) {
            return;
        }
        var needWait = deliveryMonitorHasFilterLookupUrls() && !dmFilterLookupsLoaded;
        if (needWait) {
            $wrap.addClass(DM_FILTRAR_POR_LOADING_CLS).attr({
                'aria-busy': 'true',
                'aria-label': 'Carregando filtros Categoria e Status'
            });
        } else {
            $wrap.removeClass(DM_FILTRAR_POR_LOADING_CLS).removeAttr('aria-busy').removeAttr('aria-label');
        }
    }

    /**
     * Normaliza item do proxy MVC ou shape bruto da API (codigo/valor, Value/Text).
     * Sem isto, PascalCase no JSON ou só codigo+valor fazia o Select2 mostrar só o número.
     */
    function deliveryMonitorLookupOptionPair(it) {
        if (it == null || typeof it !== 'object') {
            return null;
        }
        function isNonEmptyLookupField(x) {
            return x !== undefined && x !== null && String(x) !== '';
        }
        var valueKeys = [
            'value', 'Value', 'codigo', 'Codigo', 'id', 'Id', 'code', 'Code', 'key', 'Key',
            'statusCode', 'StatusCode', 'statusId', 'StatusId', 'codigoStatus', 'CodigoStatus',
            'status', 'Status'
        ];
        var rawOptionValue = null;
        for (var vi = 0; vi < valueKeys.length; vi++) {
            if (isNonEmptyLookupField(it[valueKeys[vi]])) {
                rawOptionValue = it[valueKeys[vi]];
                break;
            }
        }
        if (!isNonEmptyLookupField(rawOptionValue)) {
            return null;
        }
        var optionValueStr = String(rawOptionValue);
        var textKeys = [
            'valor', 'Valor', 'text', 'Text', 'descricao', 'Descricao', 'nome', 'Nome',
            'label', 'Label', 'description', 'Description', 'name', 'Name',
            'descricaoStatus', 'DescricaoStatus', 'descricaoEntrega', 'DescricaoEntrega',
            'statusDescription', 'StatusDescription', 'statusDesc', 'StatusDesc',
            'statusName', 'StatusName', 'statusLabel', 'StatusLabel',
            'displayName', 'DisplayName', 'displayText', 'DisplayText',
            'titulo', 'Titulo', 'mensagem', 'Mensagem', 'title', 'Title', 'meaning', 'Meaning'
        ];
        var displayText = null;
        for (var ti = 0; ti < textKeys.length; ti++) {
            var textCandidate = it[textKeys[ti]];
            if (isNonEmptyLookupField(textCandidate)) {
                var textCandidateStr = String(textCandidate);
                if (textCandidateStr !== optionValueStr) {
                    displayText = textCandidateStr;
                    break;
                }
            }
        }
        if (!isNonEmptyLookupField(displayText)) {
            displayText = optionValueStr;
        }
        return { value: optionValueStr, text: displayText };
    }

    function getDeliveryMonitorFilterStatusSelect2Options($el) {
        return {
            language: 'pt-BR',
            width: '100%',
            allowClear: false,
            minimumResultsForSearch: Infinity,
            dropdownCssClass: 'dm-filter-select2-dropdown' + ($el.data('style') ? ' ' + $el.data('style') : ''),
            containerCssClass: $el.data('container-class') || ''
        };
    }

    function fillDeliveryMonitorStatusOptions(items) {
        var $st = $('#dmFilterStatus');
        if (!$st.length) {
            return;
        }
        var wasSelect2 = $st.hasClass('select2-hidden-accessible');
        if (wasSelect2 && typeof $.fn.select2 === 'function') {
            $st.select2('destroy');
        }
        var prev = $st.val();
        $st.empty();
        $st.append($('<option></option>').attr('value', '0').text('Todos'));
        if ($.isArray(items)) {
            $.each(items, function (_i, it) {
                var pair = deliveryMonitorLookupOptionPair(it);
                if (!pair) {
                    return;
                }
                $st.append($('<option></option>').attr('value', pair.value).text(pair.text));
            });
        }
        var want = prev != null && prev !== '' ? String(prev) : '0';
        var exists = false;
        $st.find('option').each(function () {
            if ($(this).attr('value') === want) {
                exists = true;
            }
        });
        $st.val(exists ? want : '0');
        if (wasSelect2 && typeof $.fn.select2 === 'function') {
            $st.select2(getDeliveryMonitorFilterStatusSelect2Options($st));
        }
        tagDeliveryMonitorSelect2Container($st, 'deliverymonitor-select2-filtro-status');
    }

    function fillDeliveryMonitorCategoriaOptions(items) {
        var $c = $('#dmFilterCategoria');
        if (!$c.length) {
            return;
        }
        var prev = $c.val();
        if (prev == null) {
            prev = [];
        }
        if (!$.isArray(prev)) {
            prev = [prev];
        }
        $c.empty();
        $c.append($('<option></option>'));
        if ($.isArray(items)) {
            $.each(items, function (_i, it) {
                var pair = deliveryMonitorLookupOptionPair(it);
                if (!pair) {
                    return;
                }
                $c.append($('<option></option>').attr('value', pair.value).text(pair.text));
            });
        }
        var validPrev = [];
        $.each(prev, function (_idx, prevCategoriaVal) {
            var prevCategoriaStr = String(prevCategoriaVal);
            var optionExists = false;
            $c.find('option').each(function () {
                if ($(this).attr('value') === prevCategoriaStr) {
                    optionExists = true;
                }
            });
            if (optionExists) {
                validPrev.push(prevCategoriaStr);
            }
        });
        if (validPrev.length) {
            $c.val(validPrev);
        }
    }

    /**
     * GET MVC → API Outbound GetStatus / GetCategoria (itens { value, text }).
     */
    function loadDeliveryMonitorFilterLookups(callback) {
        var $root = $('#dmDeliveryMonitorRoot');
        var urlStatus = $root.data('dm-filtros-status-url');
        var urlCat = $root.data('dm-filtros-categoria-url');
        var hasStatus = !!urlStatus;
        var hasCat = !!urlCat;

        if (!hasStatus && !hasCat) {
            dmFilterLookupsLoaded = true;
            syncDmFiltrarPorLoadingUI();
            $(document).trigger('deliveryMonitor:filterLookupsReady');
            if (typeof callback === 'function') {
                callback();
            }
            return;
        }
        if (dmFilterLookupsLoaded) {
            if (typeof callback === 'function') {
                callback();
            }
            return;
        }
        if (dmFilterLookupsLoading) {
            if (typeof callback === 'function') {
                $(document).one('deliveryMonitor:filterLookupsReady', function () {
                    callback();
                });
            }
            return;
        }

        dmFilterLookupsLoading = true;
        var tasks = (hasStatus ? 1 : 0) + (hasCat ? 1 : 0);
        var finished = 0;

        function finishTask() {
            finished++;
            if (finished < tasks) {
                return;
            }
            dmFilterLookupsLoading = false;
            dmFilterLookupsLoaded = true;
            syncDmFiltrarPorLoadingUI();
            $(document).trigger('deliveryMonitor:filterLookupsReady');
            if (typeof callback === 'function') {
                callback();
            }
        }

        if (hasStatus) {
            $.ajax({ url: urlStatus, type: 'GET', dataType: 'json', cache: false })
                .done(function (res) {
                    fillDeliveryMonitorStatusOptions(res && $.isArray(res.items) ? res.items : []);
                })
                .always(finishTask);
        }
        if (hasCat) {
            $.ajax({ url: urlCat, type: 'GET', dataType: 'json', cache: false })
                .done(function (res) {
                    fillDeliveryMonitorCategoriaOptions(res && $.isArray(res.items) ? res.items : []);
                })
                .always(finishTask);
        }
    }

    function ensureDeliveryMonitorFilterLookups(done) {
        if (dmFilterLookupsLoaded) {
            if (typeof done === 'function') {
                done();
            }
            return;
        }
        if (dmFilterLookupsLoading) {
            $(document).one('deliveryMonitor:filterLookupsReady', function () {
                if (typeof done === 'function') {
                    done();
                }
            });
            return;
        }
        loadDeliveryMonitorFilterLookups(done);
    }

    function syncDeliveryMonitorCategoriaPlaceholder($el) {
        if (!$el || !$el.length) {
            return;
        }

        var placeholder = $el.data('placeholder') || 'Todas as categorias';
        var values = $el.val();
        var hasValues = $.isArray(values) ? values.length > 0 : !!values;
        var $container = $el.next('.select2-container');
        var $searchField = $container.find('.select2-search__field');

        $searchField.attr('placeholder', hasValues ? '' : placeholder);
    }

    function initDeliveryMonitorFilterDateInputs() {
        var $inputs = $('#dmFilterDataEntrega, #dmFilterDataRecusa');
        if (!$inputs.length || typeof $.fn.daterangepicker !== 'function' || typeof moment === 'undefined') {
            return;
        }
        var locale = {
            format: 'DD/MM/YYYY',
            separator: ' - ',
            applyLabel: 'Aplicar',
            cancelLabel: 'Limpar',
            fromLabel: 'De: ',
            toLabel: 'Até: ',
            customRangeLabel: 'Data Específica',
            weekLabel: 'Sem.',
            daysOfWeek: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
            firstDay: 0
        };
        var emissaoMin = getDmEmissaoRangeStartMomentLocal();
        var rangeOpts = {
            showDropdowns: false,
            autoApply: true,
            showCustomRangeLabel: false,
            linkedCalendars: true,
            autoUpdateInput: false,
            parentEl: 'body',
            minDate: emissaoMin ? emissaoMin.clone() : false,
            maxDate: false,
            startDate: moment(),
            endDate: moment(),
            ranges: {
                Ontem: [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                Hoje: [moment(), moment()],
                'Semana Atual': [moment().startOf('week'), moment().endOf('week')],
                'Mês Atual': [moment().startOf('month'), moment().endOf('month')],
                'Semana Passada': [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
                'Mês Passado': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
                'Ano Atual': [moment().startOf('year'), moment().endOf('year')]
            },
            locale: locale,
            alwaysShowCalendars: true
        };
        $inputs.each(function () {
            var $input = $(this);
            var existing = $input.data('daterangepicker');
            if (existing && typeof existing.remove === 'function') {
                existing.remove();
                $input.removeData('daterangepicker');
            }
            $input.off('.dmFilterRange');
            $input.daterangepicker(rangeOpts);
            $input.on('apply.daterangepicker.dmFilterRange', function (e, picker) {
                var $this = $(this);
                clearOtherFilterDateRange($this);
                $this.val(
                    picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY')
                );
            });
            $input.on('cancel.daterangepicker.dmFilterRange', function () {
                $(this).val('');
            });
            $input.on('show.daterangepicker.dmFilterRange', function () {
                syncDmEntregaRecusaMinDateFromEmissao();
                if ($('body').hasClass('sidebar-collapsed') && $('body').hasClass('sidebar-show')) {
                    $('body').removeClass('sidebar-collapsed');
                }
                if ($('body').hasClass('sidebar-show')) {
                    $('body').removeClass('sidebar-show');
                    $('.daterangepicker').css({ left: '40px', right: 'auto' });
                }
            });
        });
        window.setTimeout(syncDmEntregaRecusaMinDateFromEmissao, 0);
    }

    function initDeliveryMonitorFilterSelectsOnce() {
        ensureDeliveryMonitorFilterLookups(function initDeliveryMonitorFilterSelectsAfterLookups() {
            if (dmFilterPanelWidgetsInitialized) {
                return;
            }
            dmFilterPanelWidgetsInitialized = true;

            if (typeof $.fn.select2 === 'function') {
                var $cat = $('#dmFilterCategoria');
                if ($cat.length) {
                    if ($cat.hasClass('select2-hidden-accessible')) {
                        $cat.select2('destroy');
                    }
                    $cat.select2({
                        language: 'pt-BR',
                        width: '100%',
                        allowClear: false,
                        placeholder: $cat.data('placeholder') || 'Todas as categorias',
                        closeOnSelect: false,
                        minimumResultsForSearch: 0,
                        dropdownCssClass: 'dm-filter-select2-dropdown' + ($cat.data('style') ? ' ' + $cat.data('style') : ''),
                        containerCssClass: $cat.data('container-class') || ''
                    });
                    tagDeliveryMonitorSelect2Container($cat, 'deliverymonitor-select2-filtro-categoria');
                    syncDeliveryMonitorCategoriaPlaceholder($cat);
                    $cat.off('change.dmCategoriaPlaceholder select2:open.dmCategoriaPlaceholder')
                        .on('change.dmCategoriaPlaceholder select2:open.dmCategoriaPlaceholder', function () {
                            var $this = $(this);
                            window.setTimeout(function () {
                                syncDeliveryMonitorCategoriaPlaceholder($this);
                            }, 0);
                        });
                }
                $('#dmFilterStatus').each(function () {
                    var $el = $(this);
                    if ($el.hasClass('select2-hidden-accessible')) {
                        $el.select2('destroy');
                    }
                    $el.select2(getDeliveryMonitorFilterStatusSelect2Options($el));
                    tagDeliveryMonitorSelect2Container($el, 'deliverymonitor-select2-filtro-status');
                });
            }
            initDeliveryMonitorFilterDateInputs();
            window.setTimeout(function () {
                wireDeliveryMonitorFilterSelect2Tooltips();
            }, 0);
        });
    }

    /**
     * CPF/CNPJ vs razão social — formatação manual (sem jquery.mask: o plugin travava em 11 dígitos e limitava texto).
     * Doc: só dígitos e . - / espaço → formata até 14 dígitos (≤11 CPF, >11 CNPJ).
     * Nome: qualquer letra ou símbolo fora do padrão de documento → valor intacto, sem limite de tamanho.
     * Campos: Destinatário (#dmFilterDestinatario) e Transportadora (#dmFilterTransportadora) — mesma regra.
     */
    function initDeliveryMonitorDocOrNomeMask() {
        var sel = '#dmFilterDestinatario, #dmFilterTransportadora';
        var docOnlyRe = /^[\d.\-\s\/]*$/;

        function formatDocDigits(raw) {
            var d = String(raw || '')
                .replace(/\D/g, '')
                .slice(0, 14);
            if (d.length === 0) {
                return '';
            }
            if (d.length <= 11) {
                if (d.length <= 3) {
                    return d;
                }
                if (d.length <= 6) {
                    return d.slice(0, 3) + '.' + d.slice(3);
                }
                if (d.length <= 9) {
                    return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
                }
                return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
            }
            if (d.length <= 2) {
                return d;
            }
            if (d.length <= 5) {
                return d.slice(0, 2) + '.' + d.slice(2);
            }
            if (d.length <= 8) {
                return d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5);
            }
            var cnpjHead = d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/';
            if (d.length <= 12) {
                return cnpjHead + d.slice(8, 12);
            }
            if (d.length === 13) {
                return cnpjHead + d.slice(8, 12) + '-' + d.slice(12, 13);
            }
            return cnpjHead + d.slice(8, 12) + '-' + d.slice(12, 14);
        }

        function placeCursorAfterDigitCount(input, newVal, digitCountBefore) {
            if (digitCountBefore <= 0) {
                try {
                    input.setSelectionRange(0, 0);
                } catch (e1) { /* IE */ }
                return;
            }
            var seen = 0;
            var i;
            for (i = 0; i < newVal.length; i++) {
                if (/\d/.test(newVal.charAt(i))) {
                    seen++;
                    if (seen === digitCountBefore) {
                        try {
                            input.setSelectionRange(i + 1, i + 1);
                        } catch (e2) { /* IE */ }
                        return;
                    }
                }
            }
            try {
                input.setSelectionRange(newVal.length, newVal.length);
            } catch (e3) { /* IE */ }
        }

        function applyDocFormat(input) {
            var raw = input.value;
            if (!docOnlyRe.test(raw)) {
                return;
            }
            var formatted = formatDocDigits(raw);
            if (formatted === raw) {
                return;
            }
            var start = input.selectionStart;
            var digitsBefore =
                start == null || typeof start !== 'number'
                    ? formatted.replace(/\D/g, '').length
                    : raw.slice(0, start).replace(/\D/g, '').length;
            input.value = formatted;
            placeCursorAfterDigitCount(input, formatted, digitsBefore);
        }

        $(sel).each(function () {
            var el = this;
            var $el = $(el);
            if (typeof $.fn.unmask === 'function') {
                $el.unmask();
            }
            $el.off('.dmDocNome');
            $el.on('input.dmDocNome paste.dmDocNome', function () {
                window.setTimeout(function () {
                    applyDocFormat(el);
                }, 0);
            });
            $el.on('compositionend.dmDocNome', function () {
                applyDocFormat(el);
            });
        });
    }

    /**
     * Estado visual quando o painel &quot;Filtrar por&quot; fica fechado (toggle ou Aplicar Filtros).
     * @param {boolean} [suppressTableShow] — se true (ex.: após Aplicar), não reexibe a tabela aqui; o table-setting.js mostra no fim do loading/draw.
     */
    function onDeliveryMonitorFiltersPanelClosed(suppressTableShow) {
        $('#dmFilterChevron').removeClass('fa-chevron-up').addClass('fa-chevron-down');
        $('#dmToggleFiltros').removeClass('active');
        $('#dmWrapFiltrarPor').removeClass('filter-panel-open');
        if (!suppressTableShow) {
            var $host = $('[data-table="' + dmDeliveryMonitorTableLookup() + '"]');
            var loadingVisible = $host.find('.loading-table').is(':visible');
            if (!loadingVisible) {
                $('#dmTableWrap').show();
            }
        }
        if ($.fn.dataTable && $.fn.dataTable.isDataTable(dmDeliveryMonitorTableLookup())) {
            $(dmDeliveryMonitorTableLookup()).DataTable().columns.adjust();
        }
        window.setTimeout(function () {
            $(document).trigger('deliveryMonitor:recalcPageLength');
        }, 0);
    }

    /**
     * Fecha o painel de filtros se estiver aberto (ex.: após Aplicar Filtros).
     * @param {boolean} [suppressTableShow] — passar true quando o reload da grid já foi disparado (só loading até o draw).
     */
    function closeDeliveryMonitorFiltersPanel(suppressTableShow) {
        var $panel = $('#filtersListDelivery');
        if (!$panel.length || !$panel.is(':visible')) {
            return;
        }
        $panel.slideUp(150, function () {
            $panel.attr('aria-hidden', 'true');
            onDeliveryMonitorFiltersPanelClosed(!!suppressTableShow);
        });
    }

    function initFiltrarPorToggle() {
        var $panel = $('#filtersListDelivery');
        var $chev = $('#dmFilterChevron');
        var $btn = $('#dmToggleFiltros');
        var $wrap = $('#dmWrapFiltrarPor');
        var $tableWrap = $('#dmTableWrap');

        $('#dmToggleFiltros').on('click', function (e) {
            e.preventDefault();
            if ($wrap.hasClass(DM_FILTRAR_POR_LOADING_CLS)) {
                return;
            }
            var willOpen = !$panel.is(':visible');

            if (willOpen) {
                $btn.addClass('active');
                $wrap.addClass('filter-panel-open');
                $tableWrap.hide();
            }

            $panel.slideToggle(150, function () {
                if ($panel.is(':visible')) {
                    $panel.attr('aria-hidden', 'false');
                    $chev.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                    initDeliveryMonitorFilterSelectsOnce();
                } else {
                    $panel.attr('aria-hidden', 'true');
                    onDeliveryMonitorFiltersPanelClosed();
                }
                window.setTimeout(function () {
                    $(document).trigger('deliveryMonitor:recalcPageLength');
                }, 0);
            });
        });
    }

    $(function () {
        initDeliveryMonitorRefreshButton();
        bindDeliveryMonitorReloadAfterGridReady();
        $(document).on('deliveryMonitor:filterLookupsReady.dmfiltrarpor', syncDmFiltrarPorLoadingUI);
        syncDmFiltrarPorLoadingUI();
        /* Intervalo de emissão antes do 1.º POST; Filtrar por tem de existir cedo (clique rápido do utilizador). */
        initDateRange();
        initFiltrarPorToggle();
        /*
         * Métricas, máscaras nos filtros e tooltips da toolbar: após a grid existir — menos JS no mesmo tick que startTable / 1.º XHR.
         */
        $(document).one('deliveryMonitor:dataTableReady', function () {
            window.setTimeout(function () {
                loadDeliveryMonitorFilterLookups();
                initMetricPanelToggles();
                initDeliveryMonitorDocOrNomeMask();
                $('#dmDeliveryMonitorRoot [data-toggle="tooltip"]').not('.dm-tooltip-chave-nfe').each(function () {
                    applyDeliveryMonitorToolbarHintTooltip($(this));
                });
                wireDeliveryMonitorEmpresaSelectTooltip();
            }, 0);
        });
        /*
         * Adiar GET de empresas para o próximo macrotask: o handler seguinte (table-init) cria o DataTable
         * e dispara o 1.º POST da grid no mesmo tick; assim o pedido principal não compete com /empresas na fila.
         */
        window.setTimeout(loadDeliveryMonitorEmpresasThenInitSelect, 0);
    });
})(jQuery);
