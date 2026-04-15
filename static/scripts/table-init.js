/**
 * Delivery Monitor — grid (colunas, ajax, modais, pesquisa local, ColVis, page length).
 *
 * Lookup da tabela (1.º arg de `startTable` e valor de `data-table` no contentor `#dmDeliveryMonitorRoot`):
 * - Predefinição: `#tblDeliveryMonitor` (constante DM_TABLE_LOOKUP_DEFAULT).
 * - HTML: `data-table="#seuId"` no `#dmDeliveryMonitorRoot` (deve coincidir com `id` da `<table>`).
 * - JS: `initDeliveryMonitorTable({ tableLookup: '#minhaTabela' })` (opcional; útil em testes ou páginas derivadas).
 *
 * O ramo especial em `table-setting.js` usa `data-dm-datatable="delivery-monitor"` no mesmo contentor — manter ao copiar o padrão.
 *
 * Arranque: `$(initDeliveryMonitorTable)` no fim. Incluir `~/Scripts/Tabelas/table-setting.js` antes (`startTable` global).
 */

(function () {
    var DM_TABLE_LOOKUP_DEFAULT = '#tblDeliveryMonitor';
    /** Sincronizado em `initDeliveryMonitorTable`; usado por handlers e por `getDeliveryMonitorTableLookup`. */
    var dmTableLookup = DM_TABLE_LOOKUP_DEFAULT;

    function normalizeDmTableLookup(raw) {
        var s = (raw == null ? '' : String(raw)).trim();
        if (!s) {
            return DM_TABLE_LOOKUP_DEFAULT;
        }
        return s.charAt(0) === '#' ? s : '#' + s;
    }

    /** Lê `data-table` do root da página (fonte de verdade para o próximo dev). */
    function resolveDmTableLookupFromDom() {
        var $r = $('#dmDeliveryMonitorRoot');
        if (!$r.length) {
            return DM_TABLE_LOOKUP_DEFAULT;
        }
        var fromDom = ($r.attr('data-table') || '').trim();
        return normalizeDmTableLookup(fromDom || DM_TABLE_LOOKUP_DEFAULT);
    }

    if (typeof jQuery !== 'undefined' && jQuery('#dmDeliveryMonitorRoot').length) {
        dmTableLookup = resolveDmTableLookupFromDom();
    }

    function escapeHtmlDeliveryMonitor(value) {
        return $('<div>').text(value == null ? '' : String(value)).html();
    }

    function buildDeliveryMonitorNfeDisplay(data, row) {
        var nfe = data == null || data === '' ? '' : String(data);
        var serie = row && row.serie != null && String(row.serie).trim() !== '' ? String(row.serie).trim() : '';
        if (!nfe) {
            return '—';
        }
        return serie ? nfe + '/' + serie : nfe;
    }

    function buildDeliveryMonitorNfeCell(data, row) {
        var nfe = data == null || data === '' ? '—' : String(data);
        var display = buildDeliveryMonitorNfeDisplay(data, row);
        var statusMeta = getDeliveryMonitorStatusMeta(row && row.status);
        var status = statusMeta.label;
        var statusClass = 'pill-default';
        var chaveAcesso = escapeHtmlDeliveryMonitor(resolveDeliveryMonitorChaveAcesso(row));
        var rawKey = row && row.id != null && String(row.id).trim() !== ''
            ? String(row.id)
            : nfe + '-' + (row && row.serie != null ? String(row.serie) : '0');
        var detailKey = rawKey.replace(/[^a-zA-Z0-9_-]/g, '_');
        return [
            '<div class="details" id="details-', detailKey, '">',
            '  <div class="pill ', statusClass, ' dm-nfe-pill" data-toggle="tooltip" data-placement="top" title="', escapeHtmlDeliveryMonitor(display), '">', escapeHtmlDeliveryMonitor(display), '</div>',
            '  <div class="items-details dm-row-actions" role="group" aria-label="Ações da NF-e">',
            '    <span role="button" tabindex="0" data-toggle="tooltip" data-placement="top" data-dm-action="detalhes" title="Detalhes do documento" aria-label="Detalhes do documento" data-testid="deliverymonitor-linha-acao-detalhes">',
            '      <i class="fa fa-search icon-custom" aria-hidden="true"></i>',
            '    </span>',
            '    <span role="button" tabindex="0" data-toggle="tooltip" data-placement="top" data-dm-action="documento" title="Visualizar documento" aria-label="Visualizar documento" data-testid="deliverymonitor-linha-acao-documento">',
            '      <i class="fa fa-file-pdf-o icon-custom" aria-hidden="true"></i>',
            '    </span>',
            '    <span role="button" tabindex="0" data-toggle="tooltip" data-placement="top" data-dm-action="cancelar" data-dm-chave-acesso="', chaveAcesso, '" title="Cancelar" aria-label="Cancelar comprovante de entrega" data-testid="deliverymonitor-linha-acao-cancelar">',
            '      <i class="fa fa-ban icon-custom" aria-hidden="true"></i>',
            '    </span>',
            '  </div>',
            '</div>'
        ].join('');
    }

    function getDeliveryMonitorStatusMeta(statusValue) {
        var key = statusValue == null ? '' : String(statusValue).trim();
        var map = {
            '1': { label: 'Em Trânsito', icon: 'fa-truck', colorClass: 'dm-status-icon--transito' },
            '2': { label: 'Entregue', icon: 'fa-check-circle', colorClass: 'dm-status-icon--entregue' },
            '3': { label: 'Entrega Cancelada', icon: 'fa-ban', colorClass: 'dm-status-icon--cancelado' },
            '4': { label: 'Recusado', icon: 'fa-times-circle', colorClass: 'dm-status-icon--recusado' },
            '5': { label: 'Recusa Cancelada', icon: 'fa-ban', colorClass: 'dm-status-icon--recusa-cancelada' },
            '6': { label: 'Em Atraso', icon: 'fa-clock-o', colorClass: 'dm-status-icon--atraso' },
            '7': { label: 'Documento Fiscal Cancelado', icon: 'fa-file-text-o', colorClass: 'dm-status-icon--doc-cancelado' }
        };
        return map[key] || {
            label: key || '—',
            icon: 'fa-circle',
            colorClass: 'dm-status-icon--default'
        };
    }

    function buildDeliveryMonitorStatusCell(data) {
        var meta = getDeliveryMonitorStatusMeta(data);
        return [
            '<span class="dm-status-cell" data-toggle="tooltip" data-placement="top" title="', escapeHtmlDeliveryMonitor(meta.label), '">',
            '  <i class="fa ', meta.icon, ' dm-metric-icon dm-status-icon ', meta.colorClass, '" aria-hidden="true"></i>',
            '</span>'
        ].join('');
    }

    /** Recebido: verdadeiro verde, falso cinza (sem vermelho). */
    function getDeliveryMonitorRecebidoMeta(value) {
        var normalized = value == null ? '' : String(value).trim().toLowerCase();
        if (normalized === 'sim' || normalized === 'true' || normalized === '1') {
            return { label: 'Sim', className: 'dm-recebido-dot--sim' };
        }
        if (normalized === 'nao' || normalized === 'não' || normalized === 'false' || normalized === '0') {
            return { label: 'Não', className: 'dm-recebido-dot--nao' };
        }
        return { label: value == null || value === '' ? '—' : String(value), className: 'dm-recebido-dot--unknown' };
    }

    function buildDeliveryMonitorRecebidoDotCell(value) {
        var meta = getDeliveryMonitorRecebidoMeta(value);
        return [
            '<span class="dm-bool-dot-wrap" data-toggle="tooltip" data-placement="top" title="', escapeHtmlDeliveryMonitor(meta.label), '">',
            '  <span class="dm-bool-dot ', meta.className, '" aria-hidden="true"></span>',
            '</span>'
        ].join('');
    }

    /** Enum enviadoSistDestino: 1 cinza, 2 verde, 3 vermelho. */
    function getDeliveryMonitorEnviadoMeta(row) {
        var raw =
            row && row.enviadoSistDestino != null && row.enviadoSistDestino !== ''
                ? row.enviadoSistDestino
                : row && row.EnviadoSistDestino != null && row.EnviadoSistDestino !== ''
                    ? row.EnviadoSistDestino
                    : null;
        var n = raw == null || raw === '' ? NaN : Number(raw);
        if (!isNaN(n) && n !== 0) {
            if (n === 1) {
                return { label: 'Pendente', className: 'dm-enviado-dot--cinza' };
            }
            if (n === 2) {
                return { label: 'Enviado', className: 'dm-enviado-dot--verde' };
            }
            if (n === 3) {
                return { label: 'Falha', className: 'dm-enviado-dot--vermelho' };
            }
        }
        var fallback = row && row.enviado != null && row.enviado !== '' ? String(row.enviado).trim() : '';
        if (fallback === '1') {
            return { label: 'Pendente', className: 'dm-enviado-dot--cinza' };
        }
        if (fallback === '2') {
            return { label: 'Enviado', className: 'dm-enviado-dot--verde' };
        }
        if (fallback === '3') {
            return { label: 'Falha', className: 'dm-enviado-dot--vermelho' };
        }
        return { label: fallback || '—', className: 'dm-enviado-dot--unknown' };
    }

    function buildDeliveryMonitorEnviadoDotCell(row) {
        var meta = getDeliveryMonitorEnviadoMeta(row);
        return [
            '<span class="dm-bool-dot-wrap" data-toggle="tooltip" data-placement="top" title="', escapeHtmlDeliveryMonitor(meta.label), '">',
            '  <span class="dm-bool-dot ', meta.className, '" aria-hidden="true"></span>',
            '</span>'
        ].join('');
    }

    function buildDeliveryMonitorTooltipTextCell(value) {
        var text = value == null || value === '' ? '—' : String(value);
        return [
            '<span class="dm-tooltip-text-cell dm-tooltip-chave-nfe" data-toggle="tooltip" data-placement="top" title="',
            escapeHtmlDeliveryMonitor(text),
            '">',
            escapeHtmlDeliveryMonitor(text),
            '</span>'
        ].join('');
    }

    /** Destinatário: célula com reticências (CSS) e tooltip Bootstrap com o nome completo. */
    function buildDeliveryMonitorDestinatarioCell(data, type) {
        if (type !== 'display') {
            return data == null || data === '' ? '' : String(data);
        }
        var full = data == null || data === '' ? '—' : String(data);
        return [
            '<span class="dm-col-cliente-clip" data-toggle="tooltip" data-placement="top" title="', escapeHtmlDeliveryMonitor(full), '">',
            escapeHtmlDeliveryMonitor(full),
            '</span>'
        ].join('');
    }

    function getDeliveryMonitorColvisColumns(tableApi) {
        var columns = [];
        tableApi.columns().every(function (idx) {
            var header = this.header();
            var settingsColumn = tableApi.settings()[0].aoColumns[idx];
            var $header = $(header);
            if ($header.hasClass('noVis') || (settingsColumn && settingsColumn.nTh && $(settingsColumn.nTh).hasClass('noVis'))) {
                return;
            }

            var title = $.trim($header.text()).replace(/\s+/g, ' ');
            if (!title) {
                return;
            }

            columns.push({
                index: idx,
                title: title,
                visible: this.visible()
            });
        });
        return columns;
    }

    function renderDeliveryMonitorColvisPanel(tableApi) {
        var $host = $('#btnOcultarColunas');
        if (!$host.length) {
            return;
        }

        var columns = getDeliveryMonitorColvisColumns(tableApi);
        var left = [];
        var right = [];

        columns.forEach(function (col, idx) {
            var itemHtml = [
                '<label class="dm-colvis-item ', col.visible ? 'dm-colvis-item--active' : 'dm-colvis-item--inactive', '" data-col-index="', col.index, '" data-testid="deliverymonitor-colvis-col-', col.index, '">',
                '  <input type="checkbox" class="dm-colvis-checkbox" data-testid="deliverymonitor-colvis-checkbox-', col.index, '" ', col.visible ? 'checked' : '', ' />',
                '  <span class="dm-colvis-handle"><i class="fa fa-ellipsis-v"></i><i class="fa fa-ellipsis-v"></i></span>',
                '  <span class="dm-colvis-text">', escapeHtmlDeliveryMonitor(col.title), '</span>',
                '</label>'
            ].join('');

            if (idx % 2 === 0) {
                left.push(itemHtml);
            } else {
                right.push(itemHtml);
            }
        });

        var panelHtml = [
            '<div class="dm-colvis-panel" id="dmColvisPanel" data-testid="deliverymonitor-painel-colunas" style="display:none;" role="region" aria-label="Colunas visíveis na tabela">',
            '  <div class="dm-colvis-grid">',
            '    <div class="dm-colvis-col">', left.join(''), '</div>',
            '    <div class="dm-colvis-col">', right.join(''), '</div>',
            '  </div>',
            '</div>'
        ].join('');

        $host.find('#dmColvisPanel').remove();
        $host.append(panelHtml);
    }

    function wireDeliveryMonitorColvisButton() {
        if (!$.fn.dataTable.isDataTable(dmTableLookup)) {
            return;
        }

        var tableApi = $(dmTableLookup).DataTable();
        var $host = $('#btnOcultarColunas');
        var $button = $('#btnOcultarColunas .square-button');
        if (!$host.length || !$button.length) {
            return;
        }

        $host.addClass('dm-colvis-host');
        renderDeliveryMonitorColvisPanel(tableApi);

        $button.off('click.dmColvis').on('click.dmColvis', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var wasVisible = $host.find('#dmColvisPanel:visible').length > 0;
            renderDeliveryMonitorColvisPanel(tableApi);
            $host.find('#dmColvisPanel').toggle(!wasVisible);
        });

        $host.off('change.dmColvis', '.dm-colvis-checkbox').on('change.dmColvis', '.dm-colvis-checkbox', function () {
            var $item = $(this).closest('.dm-colvis-item');
            var colIndex = parseInt($item.data('col-index'), 10);
            var isChecked = $(this).is(':checked');
            $item.toggleClass('dm-colvis-item--active', isChecked);
            $item.toggleClass('dm-colvis-item--inactive', !isChecked);
            tableApi.column(colIndex).visible(isChecked, false);
            tableApi.columns.adjust();
        });

        $(document).off('click.dmColvisOutside').on('click.dmColvisOutside', function (e) {
            if (!$(e.target).closest('#btnOcultarColunas').length) {
                $('#dmColvisPanel').hide();
            }
        });
    }

    function handleDeliveryMonitorRowAction(action, rowData) {
        var callbacks = {
            detalhes: window.openDeliveryMonitorDetalhes,
            documento: window.openDeliveryMonitorDocumento,
            cancelar: window.cancelDeliveryMonitorDocumento
        };
        var actionHandler = callbacks[action];
        if (typeof actionHandler === 'function') {
            actionHandler(rowData);
            return;
        }
        if (typeof simpleErrorToast === 'function') {
            if (action === 'detalhes') {
                simpleErrorToast('Modal de detalhes ainda não foi ligado nesta tela.', 5000);
                return;
            }
            simpleErrorToast('Ação ainda não foi ligada nesta tela.', 5000);
        }
    }

    function resolveDeliveryMonitorChaveAcesso(rowData) {
        var rawValue = rowData && (
            rowData.chaveAcessoNfe ||
            rowData.chaveAcessoNFe ||
            rowData.ChaveAcessoNfe ||
            rowData.ChaveAcessoNFe ||
            (rowData.informacoesAdicionais && (
                rowData.informacoesAdicionais.chaveAcessoNfe ||
                rowData.informacoesAdicionais.chaveAcessoNFe ||
                rowData.informacoesAdicionais.ChaveAcessoNfe ||
                rowData.informacoesAdicionais.ChaveAcessoNFe
            ))
        );

        return rawValue == null ? '' : String(rawValue).trim();
    }

    function resolveDeliveryMonitorLinhaId(rowData) {
        if (!rowData) {
            return '';
        }
        var rawLinhaId = rowData.id != null ? rowData.id : (rowData.Id || rowData.ID);
        return rawLinhaId == null ? '' : String(rawLinhaId).trim();
    }

    /** Identificador do controlo de comprovante para GET delivery-monitor-audit/controle/… */
    function resolveDeliveryMonitorControleComprovanteEntregaId(rowData) {
        if (!rowData) {
            return '';
        }
        var rawControleId =
            rowData.controleComprovanteEntregaId ||
            rowData.ControleComprovanteEntregaId ||
            rowData.id ||
            rowData.Id;
        return rawControleId == null ? '' : String(rawControleId).trim();
    }

    function formatDeliveryMonitorAuditDateTime(iso) {
        if (iso == null || String(iso).trim() === '') {
            return '—';
        }
        var d = new Date(String(iso));
        if (isNaN(d.getTime())) {
            return String(iso);
        }
        function pad(x) {
            return x < 10 ? '0' + x : String(x);
        }
        return (
            pad(d.getDate()) +
            '/' +
            pad(d.getMonth() + 1) +
            '/' +
            d.getFullYear() +
            ' - ' +
            pad(d.getHours()) +
            ':' +
            pad(d.getMinutes()) +
            ':' +
            pad(d.getSeconds())
        );
    }

    function mapDeliveryMonitorAuditResponseToTimelineEvents(items) {
        if (!$.isArray(items) || !items.length) {
            return [];
        }
        var sorted = items.slice().sort(function (a, b) {
            var da = Date.parse(a && a.dataHora ? String(a.dataHora) : '') || 0;
            var db = Date.parse(b && b.dataHora ? String(b.dataHora) : '') || 0;
            return da - db;
        });
        sorted.reverse();
        var n = sorted.length;
        return sorted.map(function (it, idx) {
            var title =
                it && it.descricao != null && String(it.descricao).trim() !== ''
                    ? String(it.descricao)
                    : 'Evento';
            var obs =
                it && it.observacao != null && String(it.observacao).trim() !== ''
                    ? String(it.observacao)
                    : null;
            return {
                step: n - idx,
                at: formatDeliveryMonitorAuditDateTime(it && it.dataHora),
                title: title,
                detail: obs,
                markerClass: 'dm-eventos-item__marker--audit-ok'
            };
        });
    }

    /** Texto extra para pesquisa local (id, NF-e, chave — atributos não entram em .text()). */
    function buildDeliveryMonitorVisibleRowSearchHaystack(rowData, $tr) {
        var pieces = [];
        if (rowData) {
            var idStr = resolveDeliveryMonitorLinhaId(rowData);
            if (idStr) {
                pieces.push(idStr);
            }
            var chave = resolveDeliveryMonitorChaveAcesso(rowData);
            if (chave) {
                pieces.push(chave);
            }
            var nfe = rowData.nfe != null && rowData.nfe !== '' ? String(rowData.nfe) : '';
            if (!nfe && rowData.Nfe != null && rowData.Nfe !== '') {
                nfe = String(rowData.Nfe);
            }
            if (nfe) {
                pieces.push(nfe);
            }
            var nr = rowData.nrDocumento != null ? String(rowData.nrDocumento) : '';
            if (!nr && rowData.NrDocumento != null) {
                nr = String(rowData.NrDocumento);
            }
            if (nr) {
                pieces.push(nr);
            }
            var ne = rowData.nomeEmitente != null && rowData.nomeEmitente !== '' && rowData.nomeEmitente !== '—'
                ? String(rowData.nomeEmitente)
                : '';
            if (!ne && rowData.NomeEmitente != null && rowData.NomeEmitente !== '' && rowData.NomeEmitente !== '—') {
                ne = String(rowData.NomeEmitente);
            }
            if (ne) {
                pieces.push(ne);
            }
            var nt = rowData.nomeTransportadora != null && rowData.nomeTransportadora !== '' && rowData.nomeTransportadora !== '—'
                ? String(rowData.nomeTransportadora)
                : '';
            if (!nt && rowData.NomeTransportadora != null && rowData.NomeTransportadora !== '' && rowData.NomeTransportadora !== '—') {
                nt = String(rowData.NomeTransportadora);
            }
            if (nt) {
                pieces.push(nt);
            }
            var ck = rowData.chaveAcessoNfe != null && rowData.chaveAcessoNfe !== '' ? String(rowData.chaveAcessoNfe) : '';
            if (!ck && rowData.ChaveAcessoNfe != null && rowData.ChaveAcessoNfe !== '') {
                ck = String(rowData.ChaveAcessoNfe);
            }
            if (ck) {
                pieces.push(ck);
            }
        }
        if ($tr && $tr.length) {
            $tr.find('[data-dm-chave-acesso]').each(function () {
                var a = ($(this).attr('data-dm-chave-acesso') || '').trim();
                if (a) {
                    pieces.push(a);
                }
            });
        }
        return pieces.join(' ');
    }

    function deliveryMonitorVisibleSearchMatches(qLower, hayLower, opts) {
        var narrowDigits = opts && opts.narrowDigits;
        if (!qLower) {
            return true;
        }
        if (hayLower.indexOf(qLower) !== -1) {
            return true;
        }
        var qDigits = qLower.replace(/\D/g, '');
        if (qDigits.length >= 3 && !narrowDigits) {
            var hayDigits = hayLower.replace(/\D/g, '');
            if (hayDigits.indexOf(qDigits) !== -1) {
                return true;
            }
        }
        return false;
    }

    /** Pesquisa só com dígitos/separadores: restringe ao id, NF-e, chave, nr. documento (evita “51” em endereço/CNPJ na célula). */
    function deliveryMonitorLocalSearchUsesNarrowHaystack(qRaw) {
        var s = (qRaw || '').trim();
        if (!s) {
            return false;
        }
        if (/[a-zA-Z\u00C0-\u017F]/.test(s)) {
            return false;
        }
        var digits = s.replace(/\D/g, '');
        return digits.length >= 1 && digits.length <= 44;
    }

    function syncDeliveryMonitorSearchClearButton() {
        var $btn = $('#dmGridSearchClear');
        var $inp = $('#dmGridSearch');
        if (!$btn.length || !$inp.length) {
                return;
            }
        $btn.toggleClass('is-hidden', !($inp.val() || '').trim());
    }

    function dmFallbackDeliveryMonitorInfoFooter(api, $info) {
        var settings = api.settings()[0];
        var lang = settings.oLanguage || {};
        var pi = api.page.info();
        var fmt = function (n) {
            if (settings.oApi && typeof settings.oApi.fnFormatNumber === 'function') {
                return settings.oApi.fnFormatNumber.call(settings, n);
            }
            return String(n);
        };
        var rd = pi.recordsDisplay;
        if (!rd) {
            $info.html(lang.sInfoEmpty || '<div>Mostrando 0 até 0 de 0 registros</div>');
            return;
        }
        var html = (lang.sInfo || 'Mostrando de _START_ até _END_ de _TOTAL_ registros')
            .replace(/_START_/g, fmt(pi.start + 1))
            .replace(/_END_/g, fmt(pi.end))
            .replace(/_TOTAL_/g, fmt(rd))
            .replace(/_MAX_/g, fmt(pi.recordsTotal));
        if (rd !== pi.recordsTotal && lang.sInfoFiltered) {
            html += ' ' + lang.sInfoFiltered.replace(/_MAX_/g, fmt(pi.recordsTotal));
        }
        $info.html(html);
    }

    function refreshDeliveryMonitorGridFooterInfo() {
        var $tbl = $(dmTableLookup);
        var $input = $('#dmGridSearch');
        var $wrap = $(dmTableLookup + '_wrapper');
        if (!$tbl.length || !$.fn.dataTable.isDataTable($tbl)) {
            return;
        }
        var api = $tbl.DataTable();
        var settings = api.settings()[0];
        var $info = $(api.table().container()).find('.dataTables_info');
        if (!$info.length) {
            return;
        }

        var qRaw = ($input.val() || '').trim();
        if (!qRaw) {
            if ($wrap.length) {
                $wrap.removeClass('dm-local-search-active');
            }
            if (settings.oApi && typeof settings.oApi._fnUpdateInfo === 'function') {
                try {
                    settings.oApi._fnUpdateInfo(settings);
                    return;
                } catch (e1) {
                    /* continua para fallback */
                }
            }
            dmFallbackDeliveryMonitorInfoFooter(api, $info);
            return;
        }

        if ($wrap.length) {
            $wrap.addClass('dm-local-search-active');
        }

        var onPage = 0;
        var visible = 0;
        api.rows({ page: 'current' }).every(function () {
            var $tr = $(this.node());
            if (!$tr.length || $tr.hasClass('child') || $tr.hasClass('dm-local-search-empty-row')) {
                return;
            }
            onPage++;
            if ($tr.is(':visible')) {
                visible++;
            }
        });
        var fmt = function (n) {
            if (settings.oApi && typeof settings.oApi.fnFormatNumber === 'function') {
                return settings.oApi.fnFormatNumber.call(settings, n);
            }
            return String(n);
        };
        $info.html(
            '<div class="dm-local-search-info">Mostrando ' + fmt(visible) + ' de ' + fmt(onPage) + ' registros</div>'
        );
    }

    function removeDeliveryMonitorLocalSearchPlaceholderRow() {
        $(dmTableLookup + ' tbody tr.dm-local-search-empty-row').remove();
    }

    /**
     * Mesmo texto que noRecordsHtml em table-setting.js — uma linha &lt;tbody&gt; com colspan (como sEmptyTable),
     * em vez de overlay position:absolute (quebrava alinhamento do thead quando todas as linhas iam a display:none).
     */
    function buildDeliveryMonitorLocalSearchEmptyRowHtml(colCount) {
        var n = typeof colCount === 'number' && colCount > 0 ? colCount : 1;
        return [
            '<tr class="dm-local-search-empty-row" data-testid="deliverymonitor-pesquisa-local-vazio" role="status" aria-live="polite">',
            '<td class="dm-local-search-empty-cell" colspan="',
            n,
            '">',
            '<div class="dm-local-search-empty-inner empty-item text-center">',
            '<i class="fa fa-search empty-icon" style="color: #EAEFF5; font-size:50px;margin-bottom:20px;" aria-hidden="true"></i>',
            '<div class="heading-md fw-bold">Nenhum Registro Encontrado.</div>',
            '<div class="heading-sm">A sua busca ou filtro atual não retornou resultados.</div>',
            '<div class="heading-sm">Verifique os filtros aplicados e tente novamente.</div>',
            '</div>',
            '</td>',
            '</tr>'
        ].join('');
    }

    function resolveDeliveryMonitorPlaceholderColCount(api) {
        var n = 0;
        try {
            n = api.columns().count();
        } catch (eCol) {
            n = 0;
        }
        if (!n) {
            n = $(dmTableLookup + ' thead tr').first().children('th, td').length;
        }
        return n > 0 ? n : 1;
    }

    /** Remove overlay legado (#dmLocalSearchEmpty) de migrações antigas. */
    function ensureDeliveryMonitorLocalSearchEmptyOverlay() {
        $('#dmLocalSearchEmpty').remove();
    }

    function syncDeliveryMonitorLocalSearchEmptyOverlay(show) {
        var $wrap = $(dmTableLookup + '_wrapper');
        var $tbl = $(dmTableLookup);
        var on = !!show;
        if ($wrap.length) {
            $wrap.toggleClass('dm-local-search-empty-visible', on);
        }
        if (!on) {
            removeDeliveryMonitorLocalSearchPlaceholderRow();
            return;
        }
        if (!$.fn.dataTable || !$.fn.dataTable.isDataTable($tbl)) {
            return;
        }
        var api = $tbl.DataTable();
        var $tbody = $tbl.children('tbody').first();
        if (!$tbody.length) {
            return;
        }
        removeDeliveryMonitorLocalSearchPlaceholderRow();
        $tbody.append(buildDeliveryMonitorLocalSearchEmptyRowHtml(resolveDeliveryMonitorPlaceholderColCount(api)));

        var $scroll = $wrap.find('.scrollX.table-responsive-Y').first();
        if ($scroll.length) {
            $scroll.scrollLeft(0);
        }
        window.requestAnimationFrame(function () {
            try {
                api.columns.adjust();
            } catch (eAdj) {
                /* ignore */
            }
            if ($scroll.length) {
                $scroll.scrollLeft(0);
            }
        });
    }

    /**
     * Extrai payload base64 puro e, se houver, o MIME do prefixo data: (ex.: data:application/pdf;base64,...).
     */
    function stripDeliveryMonitorComprovanteBase64(raw) {
        var s = raw == null ? '' : String(raw).trim();
        if (!s) {
            return { cleanB64: '', mimeHint: null };
        }
        var lower = s.toLowerCase();
        if (lower.indexOf('data:') === 0) {
            var comma = s.indexOf(',');
            if (comma < 0) {
                return { cleanB64: '', mimeHint: null };
            }
            var header = s.substring(5, comma);
            var mimeHint = header.split(';')[0].trim();
            var payload = s.substring(comma + 1).replace(/\s/g, '');
            return { cleanB64: payload, mimeHint: mimeHint || null };
        }
        var dataIdx = lower.indexOf('base64,');
        if (dataIdx !== -1) {
            s = s.substring(dataIdx + 7);
        }
        return { cleanB64: s.replace(/\s/g, ''), mimeHint: null };
    }

    function detectDeliveryMonitorBinaryMime(bytes) {
        var len = bytes.length;
        var off = 0;
        if (len >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
            off = 3;
        }
        while (off < len && (bytes[off] === 0x09 || bytes[off] === 0x0a || bytes[off] === 0x0d || bytes[off] === 0x20)) {
            off++;
        }
        if (off + 4 <= len && bytes[off] === 0x25 && bytes[off + 1] === 0x50 && bytes[off + 2] === 0x44 && bytes[off + 3] === 0x46) {
            return 'application/pdf';
        }
        if (off + 2 <= len && bytes[off] === 0xff && bytes[off + 1] === 0xd8) {
            return 'image/jpeg';
        }
        if (off + 4 <= len && bytes[off] === 0x47 && bytes[off + 1] === 0x49 && bytes[off + 2] === 0x46) {
            return 'image/gif';
        }
        if (off + 8 <= len && bytes[off] === 0x89 && bytes[off + 1] === 0x50 && bytes[off + 2] === 0x4e && bytes[off + 3] === 0x47) {
            return 'image/png';
        }
        return '';
    }

    /** Decodifica base64 do comprovante (PDF ou imagem) e devolve Blob com type coerente com o conteúdo. */
    function deliveryMonitorBase64ToComprovanteBlob(base64Payload) {
        var parsed = stripDeliveryMonitorComprovanteBase64(base64Payload);
        if (!parsed.cleanB64) {
            return null;
        }
        try {
            var bin = window.atob(parsed.cleanB64);
            var len = bin.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
                bytes[i] = bin.charCodeAt(i);
            }
            var fromMagic = detectDeliveryMonitorBinaryMime(bytes);
            var mime = fromMagic;
            if (!mime && parsed.mimeHint) {
                mime = parsed.mimeHint;
            }
            if (!mime) {
                mime = 'application/octet-stream';
            }
            return new Blob([bytes], { type: mime });
        } catch (ignore) {
            return null;
        }
    }

    function getDeliveryMonitorDisplayValue(value) {
        return value == null || value === '' ? '—' : String(value);
    }

    function resolveDeliveryMonitorDiasEmAtraso(row) {
        if (!row) {
            return null;
        }
        var v = row.diasEmAtraso != null && row.diasEmAtraso !== '' ? row.diasEmAtraso : row.DiasEmAtraso;
        if (v == null || v === '') {
            return null;
        }
        var n = parseInt(String(v), 10);
        return isNaN(n) ? null : n;
    }

    /** API <code>diasEmAtraso</code> (int); 0 → &quot;0 dias&quot;, 1 → &quot;1 dia&quot;, N → &quot;N dias&quot;. Fallback: texto legado <code>atraso</code> (Sim/Não). */
    function formatDeliveryMonitorDiasAtrasoCell(row) {
        var n = resolveDeliveryMonitorDiasEmAtraso(row);
        if (n != null) {
            if (n === 0) {
                return '0 dias';
            }
            if (n === 1) {
                return '1 dia';
            }
            return n + ' dias';
        }
        var legacy = row && row.atraso != null ? String(row.atraso).trim() : '';
        if (legacy) {
            return escapeHtmlDeliveryMonitor(legacy);
        }
        return '—';
    }

    /** Quantidade de eventos por página na modal de detalhes (evita corpo excessivamente alto). */
    var DM_EVENTOS_MODAL_PAGE_SIZE = 5;

    function buildDeliveryMonitorDetalhesTimelineItemsHtml(modalId, events, startIndex) {
        var base = typeof startIndex === 'number' && startIndex >= 0 ? startIndex : 0;
        return events
            .map(function (ev, idx) {
                var globalIdx = base + idx;
                var targetId = modalId + '-evt-' + globalIdx;
                var hasDetail = ev.detail != null && String(ev.detail).trim() !== '';
                var markerExtra = ev.markerClass ? ' ' + ev.markerClass : '';
                var stepLabel = ev.step != null ? String(ev.step) : String(globalIdx + 1);
                var metaBlock = [
                    '      <div class="dm-eventos-item__meta">',
                    '        <span class="dm-eventos-item__dt">',
                    escapeHtmlDeliveryMonitor(ev.at),
                    '</span>',
                    '        <span class="dm-eventos-item__title">',
                    escapeHtmlDeliveryMonitor(ev.title),
                    '</span>',
                    '      </div>'
                ].join('');

                if (!hasDetail) {
                    return [
                        '<div class="dm-eventos-item" data-testid="deliverymonitor-modal-eventos-item" data-evt-index="', globalIdx, '">',
                        '  <div class="dm-eventos-item__marker',
                        markerExtra,
                        '" aria-hidden="true">',
                        escapeHtmlDeliveryMonitor(stepLabel),
                        '</div>',
                        '  <div class="dm-eventos-item__body">',
                        '    <div class="dm-eventos-item__head dm-eventos-item__head--no-toggle">',
                        metaBlock,
                        '    </div>',
                        '  </div>',
                        '</div>'
                    ].join('');
                }

                var detailText = escapeHtmlDeliveryMonitor(ev.detail);
                var expanded = !!ev.expanded;
                var headClass = 'dm-eventos-item__head' + (expanded ? '' : ' collapsed');
                var panelClass = 'collapse' + (expanded ? ' in' : '');
                var ariaExp = expanded ? 'true' : 'false';

                return [
                    '<div class="dm-eventos-item" data-testid="deliverymonitor-modal-eventos-item" data-evt-index="', globalIdx, '">',
                    '  <div class="dm-eventos-item__marker',
                    markerExtra,
                    '" aria-hidden="true">',
                    escapeHtmlDeliveryMonitor(stepLabel),
                    '</div>',
                    '  <div class="dm-eventos-item__body">',
                    '    <button type="button" class="',
                    headClass,
                    '" data-toggle="collapse" data-target="#',
                    targetId,
                    '" aria-expanded="',
                    ariaExp,
                    '" aria-controls="',
                    targetId,
                    '">',
                    metaBlock,
                    '      <span class="dm-eventos-item__chev-wrap" aria-hidden="true"><i class="fa fa-chevron-down dm-eventos-item__chev"></i></span>',
                    '    </button>',
                    '    <div id="',
                    targetId,
                    '" class="',
                    panelClass,
                    '">',
                    '      <div class="dm-eventos-item__panel-inner">',
                    '        <pre class="dm-eventos-item__xml" tabindex="0">',
                    detailText,
                    '</pre>',
                    '      </div>',
                    '    </div>',
                    '  </div>',
                    '</div>'
                ].join('');
            })
            .join('');
    }

    /**
     * Conteúdo vazio / aviso na modal de eventos — alinhado a noRecordsHtml (ícone + heading-md/sm).
     * @param {string} iconClass — classes FontAwesome, ex.: "fa fa-search"
     */
    function buildDeliveryMonitorModalEmptyStateHtml(title, subtitle, iconClass) {
        var ic = iconClass && String(iconClass).trim() ? String(iconClass).trim() : 'fa fa-search';
        var sub =
            subtitle != null && String(subtitle).trim() !== ''
                ? '<div class="heading-sm dm-eventos-modal__empty-subtitle">' +
                  escapeHtmlDeliveryMonitor(String(subtitle)) +
                  '</div>'
                : '';
        return [
            '<div class="dm-eventos-modal__empty-state" data-testid="deliverymonitor-modal-eventos-vazio" role="status">',
            '  <div class="dm-eventos-modal__empty-inner">',
            '    <i class="dm-eventos-modal__empty-icon ',
            ic,
            '" aria-hidden="true"></i>',
            '    <div class="heading-md fw-bold dm-eventos-modal__empty-title">',
            escapeHtmlDeliveryMonitor(String(title || '')),
            '</div>',
            sub,
            '  </div>',
            '</div>'
        ].join('');
    }

    function buildDeliveryMonitorEventosPagerHtml(page, totalPages, totalItems) {
        var prevDis = page <= 1 ? ' disabled="disabled"' : '';
        var nextDis = page >= totalPages ? ' disabled="disabled"' : '';
        var evWord = totalItems === 1 ? 'evento' : 'eventos';
        return [
            '<div class="dm-eventos-modal__pager" data-testid="deliverymonitor-modal-eventos-pager" role="navigation" aria-label="Paginação dos eventos">',
            '  <button type="button" class="btn btn-sm btn-default dm-eventos-modal__pager-btn"',
            prevDis,
            ' data-dm-eventos-page="prev" data-testid="deliverymonitor-modal-eventos-pagina-anterior">Anterior</button>',
            '  <span class="dm-eventos-modal__pager-info" data-testid="deliverymonitor-modal-eventos-pagina-info">',
            'Página ',
            page,
            ' de ',
            totalPages,
            ' · ',
            totalItems,
            ' ',
            evWord,
            '</span>',
            '  <button type="button" class="btn btn-sm btn-default dm-eventos-modal__pager-btn"',
            nextDis,
            ' data-dm-eventos-page="next" data-testid="deliverymonitor-modal-eventos-pagina-seguinte">Seguinte</button>',
            '</div>'
        ].join('');
    }

    function renderDeliveryMonitorDetalhesTimelinePage($modal, modalId, events, page) {
        var pageSize = DM_EVENTOS_MODAL_PAGE_SIZE;
        var total = events.length;
        var totalPages = Math.max(1, Math.ceil(total / pageSize));
        var p = typeof page === 'number' && !isNaN(page) && page >= 1 ? Math.min(Math.floor(page), totalPages) : 1;
        var start = (p - 1) * pageSize;
        var slice = events.slice(start, start + pageSize);
        var itemsHtml = buildDeliveryMonitorDetalhesTimelineItemsHtml(modalId, slice, start);
        var pagerHtml = totalPages > 1 ? buildDeliveryMonitorEventosPagerHtml(p, totalPages, total) : '';
        var $th = $('#' + modalId + '-timeline-host');
        $th.removeClass('dm-eventos-modal__timeline-host--empty').html(
            [
                '<div class="dm-eventos-timeline-wrap" data-testid="deliverymonitor-modal-eventos-timeline-wrap">',
                '  <div class="dm-eventos-modal__timeline-scroll">',
                '    <div class="dm-eventos-timeline" data-testid="deliverymonitor-modal-eventos-lista">',
                '      <div class="dm-eventos-timeline__track" aria-hidden="true"></div>',
                itemsHtml,
                '    </div>',
                '  </div>',
                pagerHtml,
                '</div>'
            ].join('')
        );
        $th.find('.dm-eventos-modal__timeline-scroll').scrollTop(0);
        $modal.data('dm-eventos-page', p);
    }

    function openDeliveryMonitorDetalhes(rowData) {
        if (!$.fn || typeof $.fn.modal !== 'function') {
            return false;
        }

        var modalId = 'dmDetalhesModal';
        var modalSelector = '#' + modalId;
        var chaveAcesso = resolveDeliveryMonitorChaveAcesso(rowData);
        var nfeDisplay = buildDeliveryMonitorNfeDisplay(rowData && rowData.nfe, rowData);
        var chaveShort = chaveAcesso.length > 8 ? chaveAcesso.slice(-8) : chaveAcesso;
        var titleText =
            'DETALHES DOS EVENTOS ENTREGA NF-E ' + nfeDisplay + (chaveAcesso.length > 8 ? ' (' + chaveShort + ')' : '');

        var controleId = resolveDeliveryMonitorControleComprovanteEntregaId(rowData);
        var auditBaseRaw = $('#dmDeliveryMonitorRoot').data('dm-eventos-audit-url');
        var auditBase = auditBaseRaw == null ? '' : String(auditBaseRaw).trim();

        var modalHtml = [
            '<div class="modal fade dm-details-modal dm-eventos-modal" id="',
            modalId,
            '" data-testid="deliverymonitor-modal-eventos" data-backdrop="static" tabindex="-1" role="dialog" aria-labelledby="dmDetalhesModalTitle" aria-hidden="true">',
            '  <div class="modal-dialog" role="document">',
            '    <div class="modal-content">',
            '      <div class="modal-header bg-green-invoisys">',
            '        <button type="button" class="close" data-dismiss="modal" data-testid="deliverymonitor-modal-eventos-fechar" aria-label="Fechar" style="opacity: initial;"><i class="fa fa-close f-20"></i></button>',
            '        <h2 class="modal-title bold dm-eventos-modal__title" id="dmDetalhesModalTitle">',
            escapeHtmlDeliveryMonitor(titleText),
            '</h2>',
            '      </div>',
            '      <div class="modal-body dm-eventos-modal__body">',
            '        <div class="dm-eventos-modal__loading-shell" id="',
            modalId,
            '-loading" data-testid="deliverymonitor-modal-eventos-loading">',
            '          <p class="dm-eventos-modal__loading-msg">Carregando histórico de eventos…</p>',
            '        </div>',
            '        <div class="dm-eventos-modal__timeline-host" id="',
            modalId,
            '-timeline-host" data-testid="deliverymonitor-modal-eventos-timeline" style="display:none;"></div>',
            '      </div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');

        $(modalSelector).remove();
        $('body').append(modalHtml);

        var $modal = $(modalSelector);
        $modal.on('hidden.bs.modal', function () {
            $modal.remove();
        });
        $modal.on('click.dmEvtPager', '[data-dm-eventos-page]', function (e) {
            e.preventDefault();
            var $btn = $(this);
            if ($btn.prop('disabled')) {
                return;
            }
            var dir = $btn.attr('data-dm-eventos-page');
            var all = $modal.data('dm-eventos-list');
            if (!$.isArray(all) || !all.length) {
                return;
            }
            var pageSize = DM_EVENTOS_MODAL_PAGE_SIZE;
            var totalPages = Math.max(1, Math.ceil(all.length / pageSize));
            var cur = parseInt($modal.data('dm-eventos-page'), 10);
            if (isNaN(cur) || cur < 1) {
                cur = 1;
            }
            var next = cur;
            if (dir === 'prev') {
                next = cur - 1;
            } else if (dir === 'next') {
                next = cur + 1;
            }
            if (next < 1 || next > totalPages) {
                return;
            }
            renderDeliveryMonitorDetalhesTimelinePage($modal, modalId, all, next);
        });
        $modal.modal('show');

        function showTimelineMessage(text) {
            $('#' + modalId + '-loading').hide();
            $('#' + modalId + '-timeline-host')
                .addClass('dm-eventos-modal__timeline-host--empty')
                .show()
                .html(
                    buildDeliveryMonitorModalEmptyStateHtml(
                        'Não foi possível exibir o histórico',
                        text,
                        'fa fa-exclamation-circle'
                    )
                );
        }

        if (!controleId || !auditBase) {
            var msg = !controleId
                ? 'Não foi possível identificar o controlo desta linha para carregar o histórico de auditoria.'
                : 'URL de auditoria não configurada na página.';
            if (typeof simpleErrorToast === 'function') {
                simpleErrorToast(msg, 5000);
            }
            showTimelineMessage(msg);
            return true;
        }

        var requestUrl =
            auditBase + (auditBase.indexOf('?') >= 0 ? '&' : '?') + 'controleComprovanteEntregaId=' + encodeURIComponent(controleId);

        $.ajax({ url: requestUrl, type: 'GET', dataType: 'json', cache: false })
            .done(function (data) {
                if (data && data.error && !$.isArray(data)) {
                    if (typeof simpleErrorToast === 'function') {
                        simpleErrorToast(String(data.error), 5000);
                    }
                    showTimelineMessage(String(data.error));
                    return;
                }
                var list = $.isArray(data) ? data : [];
                var events = mapDeliveryMonitorAuditResponseToTimelineEvents(list);
                /* O map devolve mais recente primeiro; inverter para passo 1 na 1.ª página e fluxo cronológico na tela. */
                events.reverse();
                $('#' + modalId + '-loading').hide();
                var $th = $('#' + modalId + '-timeline-host').show();
                if (!events.length) {
                    $th.addClass('dm-eventos-modal__timeline-host--empty').html(
                        buildDeliveryMonitorModalEmptyStateHtml(
                            'Nenhum Registro Encontrado.',
                            'Não há eventos de auditoria para este comprovante de entrega.',
                            'fa fa-search'
                        )
                    );
                    return;
                }
                $modal.data('dm-eventos-list', events);
                $modal.data('dm-eventos-page', 1);
                renderDeliveryMonitorDetalhesTimelinePage($modal, modalId, events, 1);
            })
            .fail(function (xhr) {
                var err = 'Não foi possível carregar o histórico de eventos.';
                if (xhr && xhr.responseJSON && xhr.responseJSON.error) {
                    err = String(xhr.responseJSON.error);
                } else if (xhr && xhr.responseText) {
                    try {
                        var errorPayload = JSON.parse(xhr.responseText);
                        if (errorPayload && errorPayload.error) {
                            err = String(errorPayload.error);
                        }
                    } catch (ignore) {
                        /* ignore */
                    }
                }
                if (typeof simpleErrorToast === 'function') {
                    simpleErrorToast(err, 5000);
                }
                showTimelineMessage(err);
            });

        return true;
    }

    function buildDeliveryMonitorComprovanteUrl(chave) {
        var base = $('#dmDeliveryMonitorRoot').data('dm-comprovante-url');
        if (base == null || String(base).trim() === '') {
            return '';
        }
        var s = String(base).trim();
        if (s.indexOf('{chave}') !== -1) {
            return s.replace(/\{chave\}/g, encodeURIComponent(chave));
        }
        return s + (s.indexOf('?') >= 0 ? '&' : '?') + 'chave=' + encodeURIComponent(chave);
    }

    /**
     * Modal de comprovante: prioriza GET JSON (data-dm-comprovante-imagem-url + id da linha); senão, blob via data-dm-comprovante-url + chave.
     */
    function openDeliveryMonitorDocumento(rowData) {
        if (!$.fn || typeof $.fn.modal !== 'function') {
            return false;
        }

        var chave = resolveDeliveryMonitorChaveAcesso(rowData);
        var linhaId = resolveDeliveryMonitorLinhaId(rowData);
        var imagemJsonUrlRaw = $('#dmDeliveryMonitorRoot').data('dm-comprovante-imagem-url');
        var imagemJsonUrl = imagemJsonUrlRaw == null ? '' : String(imagemJsonUrlRaw).trim();
        var useImagemApi = !!(linhaId && imagemJsonUrl);

        if (!useImagemApi && !chave) {
            if (typeof simpleErrorToast === 'function') {
                simpleErrorToast('Não foi possível identificar o comprovante (id da linha ou chave de acesso da NF-e).', 5000);
            }
            return false;
        }

        var nfeDisplay = buildDeliveryMonitorNfeDisplay(rowData && rowData.nfe, rowData);
        var suffixLabel = '';
        if (chave && chave.length > 8) {
            suffixLabel = chave.slice(-8);
        } else if (chave) {
            suffixLabel = chave;
        } else if (linhaId && linhaId.length > 8) {
            suffixLabel = linhaId.slice(-8);
        } else if (linhaId) {
            suffixLabel = linhaId;
        }
        var titleText = 'COMPROVANTE DE ENTREGA NF-E ' + nfeDisplay + (suffixLabel ? ' (' + suffixLabel + ')' : '');
        var modalId = 'dmComprovanteModal';
        var modalSelector = '#' + modalId;

        var modalHtml = [
            '<div class="modal fade dm-comprovante-modal" id="', modalId, '" data-testid="deliverymonitor-modal-comprovante" data-backdrop="static" tabindex="-1" role="dialog" aria-labelledby="dmComprovanteModalTitle" aria-hidden="true">',
            '  <div class="modal-dialog" role="document">',
            '    <div class="modal-content">',
            '      <div class="modal-header bg-green-invoisys">',
            '        <button type="button" class="close" data-dismiss="modal" data-testid="deliverymonitor-modal-comprovante-fechar" aria-label="Fechar" style="opacity: initial;"><i class="fa fa-close f-20"></i></button>',
            '        <h2 class="modal-title bold dm-comprovante-modal__title" id="dmComprovanteModalTitle">', escapeHtmlDeliveryMonitor(titleText), '</h2>',
            '      </div>',
            '      <div class="modal-body dm-comprovante-modal__body">',
            '        <div class="dm-comprovante-modal__frame-wrap">',
            '          <div class="dm-comprovante-modal__loading" data-testid="deliverymonitor-modal-comprovante-loading">',
            '            <span class="dm-comprovante-modal__loading-text">Carregando comprovante…</span>',
            '          </div>',
            '          <iframe class="dm-comprovante-modal__iframe" data-testid="deliverymonitor-modal-comprovante-iframe" title="Pré-visualização do comprovante" src="about:blank"></iframe>',
            '          <img class="dm-comprovante-modal__img" data-testid="deliverymonitor-modal-comprovante-imagem" alt="Pré-visualização do comprovante" style="display:none;" />',
            '          <div class="dm-comprovante-modal__placeholder" data-testid="deliverymonitor-modal-comprovante-erro" style="display:none;">',
            '            <p class="dm-comprovante-modal__placeholder-title">Não foi possível carregar o comprovante</p>',
            '            <p class="dm-comprovante-modal__placeholder-text">Verifique a conexão ou tente novamente. Se o endpoint ainda não estiver configurado, defina <code>data-dm-comprovante-url</code> na raiz da página.</p>',
            '          </div>',
            '        </div>',
            '      </div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');

        $(modalSelector).remove();
        $('body').append(modalHtml);

        var $modal = $(modalSelector);
        var $iframe = $modal.find('.dm-comprovante-modal__iframe');
        var $img = $modal.find('.dm-comprovante-modal__img');
        var $loading = $modal.find('.dm-comprovante-modal__loading');
        var $placeholder = $modal.find('.dm-comprovante-modal__placeholder');

        function cleanupComprovanteBlob() {
            var cachedObjectUrl = $modal.data('dm-comprovante-blob');
            if (cachedObjectUrl) {
                try {
                    URL.revokeObjectURL(cachedObjectUrl);
                } catch (ignore) { /* empty */ }
                $modal.removeData('dm-comprovante-blob');
            }
        }

        $modal.on('hidden.bs.modal', function () {
            cleanupComprovanteBlob();
            $iframe.attr('src', 'about:blank');
            $img.attr('src', '').hide();
            $modal.remove();
        });

        $modal.modal('show');

        $loading.show();
        $placeholder.hide();
        $iframe.hide();
        $img.hide().attr('src', '');

        function resetPlaceholderDefault() {
            $placeholder.find('.dm-comprovante-modal__placeholder-text').html('Verifique a conexão ou tente novamente. Se o endpoint ainda não estiver configurado, defina <code>data-dm-comprovante-url</code> na raiz da página.');
        }

        if (useImagemApi) {
            $.ajax({
                url: imagemJsonUrl,
                type: 'GET',
                data: { id: linhaId },
                dataType: 'json'
            }).done(function (res) {
                if (!res || res.success !== true) {
                    var msg = (res && res.message) ? String(res.message) : 'Não foi possível obter o comprovante.';
                    resetPlaceholderDefault();
                    $placeholder.find('.dm-comprovante-modal__placeholder-text').text(msg);
                    $placeholder.show();
                    return;
                }
                var b64 = res.imagemComprovanteBase64;
                if (!b64) {
                    resetPlaceholderDefault();
                    $placeholder.find('.dm-comprovante-modal__placeholder-text').text('Conteúdo em base64 não disponível na resposta.');
                    $placeholder.show();
                    return;
                }
                var blob = deliveryMonitorBase64ToComprovanteBlob(b64);
                if (!blob) {
                    resetPlaceholderDefault();
                    $placeholder.find('.dm-comprovante-modal__placeholder-text').text('Não foi possível decodificar o comprovante.');
                    $placeholder.show();
                    return;
                }
                cleanupComprovanteBlob();
                var objectUrl = URL.createObjectURL(blob);
                $modal.data('dm-comprovante-blob', objectUrl);
                var mime = (blob.type || '').toLowerCase();

                if (mime.indexOf('pdf') >= 0) {
                    $img.attr('src', '').hide();
                    $iframe.attr('src', objectUrl).show();
                } else if (mime.indexOf('image/') === 0) {
                    $iframe.attr('src', 'about:blank').hide();
                    $img.attr('src', objectUrl).show();
                } else {
                    $img.attr('src', '').hide();
                    $iframe.attr('src', objectUrl).show();
                }
            }).fail(function () {
                resetPlaceholderDefault();
                $placeholder.find('.dm-comprovante-modal__placeholder-text').text('Falha de rede ao carregar o comprovante.');
                $placeholder.show();
            }).always(function () {
                $loading.hide();
            });
            return true;
        }

        var url = buildDeliveryMonitorComprovanteUrl(chave);
        if (!url) {
            $loading.hide();
            resetPlaceholderDefault();
            $placeholder.show();
            return true;
        }

        $.ajax({
            url: url,
            type: 'GET',
            xhrFields: { responseType: 'blob' }
        }).done(function (blob) {
            if (!blob || blob.size === 0) {
                resetPlaceholderDefault();
                $placeholder.show();
                return;
            }
            var mime = (blob.type || '').toLowerCase();
            var objectUrl = URL.createObjectURL(blob);
            $modal.data('dm-comprovante-blob', objectUrl);

            if (mime.indexOf('pdf') >= 0) {
                $iframe.attr('src', objectUrl).show();
            } else if (mime.indexOf('png') >= 0) {
                $img.attr('src', objectUrl).show();
            } else if (mime.indexOf('image/') === 0) {
                $img.attr('src', objectUrl).show();
            } else if (mime.indexOf('html') >= 0 || mime.indexOf('text/') === 0 || mime === '') {
                $iframe.attr('src', objectUrl).show();
            } else {
                $iframe.attr('src', objectUrl).show();
            }
        }).fail(function () {
            resetPlaceholderDefault();
            $placeholder.show();
        }).always(function () {
            $loading.hide();
        });

        return true;
    }

    function cancelDeliveryMonitorDocumento(rowData) {
        var chaveAcesso = resolveDeliveryMonitorChaveAcesso(rowData);
        if (!chaveAcesso) {
            if (typeof simpleErrorToast === 'function') {
                simpleErrorToast('Não foi possível identificar a chave de acesso da NF-e.', 5000);
            }
            return;
        }

        var cancelUrl = $('#dmDeliveryMonitorRoot').data('dm-cancel-url');
        if (!cancelUrl) {
            if (typeof simpleErrorToast === 'function') {
                simpleErrorToast('Rota de cancelamento não configurada.', 5000);
            }
            return;
        }

        var mensagem = 'Será enviado o evento de <b>Cancelamento do Comprovante de Entrega</b> para a NF-e <b>' + escapeHtmlDeliveryMonitor(chaveAcesso) + '</b>. Deseja continuar?';

        if (openDeliveryMonitorCancelConfirmation(mensagem, function () {
                        sendDeliveryMonitorCancelarComprovante(cancelUrl, chaveAcesso);
        })) {
            return;
        }

        if (window.confirm(mensagem)) {
            sendDeliveryMonitorCancelarComprovante(cancelUrl, chaveAcesso);
        }
    }

    function openDeliveryMonitorCancelConfirmation(message, onConfirm) {
        if (!$.fn || typeof $.fn.modal !== 'function') {
            return false;
        }

        var modalId = 'dmCancelConfirmationModal';
        var modalSelector = '#' + modalId;
        var modalHtml = [
            '<div class="modal fade dm-cancel-modal" id="', modalId, '" data-testid="deliverymonitor-modal-cancelar-comprovante" data-backdrop="static" tabindex="-1" role="dialog" aria-labelledby="dmCancelConfirmationTitle" aria-hidden="true">',
            '  <div class="modal-dialog" role="document">',
            '    <div class="modal-content">',
            '      <div class="modal-header bg-green-invoisys">',
            '        <button type="button" class="close" data-dismiss="modal" data-testid="deliverymonitor-modal-cancelar-fechar" aria-label="Fechar" style="opacity: initial;"><i class="fa fa-close f-20"></i></button>',
            '        <h2 class="modal-title bold" id="dmCancelConfirmationTitle">Cancelar comprovante?</h2>',
            '      </div>',
            '      <div class="modal-body">', message, '</div>',
            '      <div class="modal-footer">',
            '        <div class="d-flex justify-content-between align-items-center gap-2 dm-cancel-modal-actions">',
            '          <button type="button" class="btn btn-canceled m-0" style="width:49%;" data-dismiss="modal" data-testid="deliverymonitor-modal-cancelar-voltar" aria-label="Cancelar">Cancelar</button>',
            '          <button type="button" class="btn btn-grid m-0" style="width:49%;" data-dm-confirm-cancel="true" data-testid="deliverymonitor-modal-cancelar-confirmar" aria-label="Confirmar cancelamento">OK</button>',
            '        </div>',
            '      </div>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');

        $(modalSelector).remove();
        $('body').append(modalHtml);

        var $modal = $(modalSelector);
        $modal.on('click', '[data-dm-confirm-cancel="true"]', function () {
            $modal.modal('hide');
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });
        $modal.on('hidden.bs.modal', function () {
            $modal.remove();
        });
        $modal.modal('show');
        return true;
    }

    function sendDeliveryMonitorCancelarComprovante(cancelUrl, chaveAcesso) {
        $.ajax({
            url: cancelUrl,
            type: 'POST',
            data: { chaveAcesso: chaveAcesso }
        }).done(function (response) {
            var message = response;
            var isSuccess = true;
            if (response && typeof response === 'object') {
                if (response.success === false || response.Success === false) {
                    isSuccess = false;
                }
                message = response.message || response.Message || response.result || response.Result || JSON.stringify(response);
            }

            if (!isSuccess) {
                if (typeof simpleErrorToast === 'function') {
                    simpleErrorToast(message || 'Falha ao cancelar o comprovante de entrega.', 7000);
                }
                return;
            }

            if (typeof simpleSuccessToast === 'function') {
                simpleSuccessToast(message || 'Evento de cancelamento enviado com sucesso.', 5000);
            }

            if ($.fn.dataTable.isDataTable(dmTableLookup)) {
                $(dmTableLookup).DataTable().ajax.reload(null, false);
            }
        }).fail(function (xhr) {
            var errorMessage = xhr && xhr.responseText ? xhr.responseText : 'Falha ao cancelar o comprovante de entrega.';
            if (typeof simpleErrorToast === 'function') {
                simpleErrorToast(errorMessage, 7000);
            }
        });
    }

    function debounceDeliveryMonitor(fn, waitMs) {
        var t;
        return function () {
            var ctx = this, args = arguments;
            window.clearTimeout(t);
            t = window.setTimeout(function () { fn.apply(ctx, args); }, waitMs);
        };
    }

    /**
     * Pesquisa só nas linhas já desenhadas na página atual — sem draw() / sem AJAX / sem loading.
     * (serverSide: draw(false) voltaria a chamar o servidor.)
     */
    function applyDeliveryMonitorVisibleRowsLocalFilter() {
        var $tbl = $(dmTableLookup);
        var $input = $('#dmGridSearch');
        if (!$tbl.length || !$input.length || !$.fn.dataTable || !$.fn.dataTable.isDataTable($tbl)) {
            return;
        }
        var qRaw = ($input.val() || '').trim();
        var q = qRaw.toLowerCase();
        var useNarrow = deliveryMonitorLocalSearchUsesNarrowHaystack(qRaw);
        var api = $tbl.DataTable();
        removeDeliveryMonitorLocalSearchPlaceholderRow();
        var onPage = 0;
        var matchCount = 0;
        api.rows({ page: 'current' }).every(function () {
            var $tr = $(this.node());
            if (!$tr.length || $tr.hasClass('child') || $tr.hasClass('dm-local-search-empty-row')) {
                return;
            }
            onPage++;
            var rowData = this.data();
            var extra = buildDeliveryMonitorVisibleRowSearchHaystack(rowData, $tr).toLowerCase();
            var hay;
            if (useNarrow) {
                hay = extra.replace(/\s+/g, ' ').trim();
            } else {
                var domText = $tr.text().replace(/\s+/g, ' ').toLowerCase();
                hay = (domText + ' ' + extra).replace(/\s+/g, ' ').trim();
            }
            var match = deliveryMonitorVisibleSearchMatches(q, hay, { narrowDigits: useNarrow });
            if (match) {
                matchCount++;
            }
            $tr.toggle(match);
        });
        syncDeliveryMonitorSearchClearButton();
        ensureDeliveryMonitorLocalSearchEmptyOverlay();
        syncDeliveryMonitorLocalSearchEmptyOverlay(!!qRaw && onPage > 0 && matchCount === 0);
        refreshDeliveryMonitorGridFooterInfo();
    }

    /** Linhas visíveis conforme altura do viewport / #dmTableWrap (sem scroll interno na tbody). */
    var DM_PAGE_LEN_MIN = 5;
    var DM_PAGE_LEN_MAX = 500;
    /**
     * &quot;Todos&quot;: não usar -1 (binding MVC / DataTables falhavam). Valor alto único enviado no POST como length.
     * O servidor trata length &gt;= este valor como carregar todas as páginas da API.
     */
    var DM_PAGE_LEN_TODOS_SENTINEL = 1000000;
    var DM_ROW_FALLBACK = 38;
    var dmApplyingDynamicPageLen = false;
    var dmDynamicPageLenResizeTimer = null;
    /** Ajuste automático de linhas desliga após o usuário mudar o seletor de resultados por página. */
    var dmUserChosePageLength = false;
    var dmProgrammaticPageLenChange = false;
    /** 1.ª opção do lengthMenu (dinâmica no init); usada para encaixar page.len automático nas 4 opções. */
    var dmLengthMenuDynamicValue = DM_PAGE_LEN_MIN;

    function clampDeliveryMonitorPageLen(n) {
        var v = typeof n === 'number' ? Math.round(n) : DM_PAGE_LEN_MIN;
        if (v < DM_PAGE_LEN_MIN) {
            v = DM_PAGE_LEN_MIN;
        }
        if (v > DM_PAGE_LEN_MAX) {
            v = DM_PAGE_LEN_MAX;
        }
        return v;
    }

    /** Só 4 opções: valor inicial (viewport), 25, 50, Todos. */
    function buildDeliveryMonitorLengthMenu(initialGuess) {
        var dyn = clampDeliveryMonitorPageLen(initialGuess);
        var vals = [dyn];
        if (vals.indexOf(25) === -1) {
            vals.push(25);
        }
        if (vals.indexOf(50) === -1) {
            vals.push(50);
        }
        vals.push(DM_PAGE_LEN_TODOS_SENTINEL);
        var labels = vals.map(function (v) {
            return v === DM_PAGE_LEN_TODOS_SENTINEL ? 'Todos' : String(v);
        });
        return [vals, labels];
    }

    /** Ajuste automático de linhas só usa valores que existem no menu (exceto Todos). */
    function snapDeliveryMonitorPageLenToMenuChoices(optimal, dynSlot) {
        var candidates = [clampDeliveryMonitorPageLen(dynSlot), 25, 50];
        var uniq = [];
        candidates.forEach(function (v) {
            if (uniq.indexOf(v) === -1) {
                uniq.push(v);
            }
        });
        var best = uniq[0];
        var bestD = Math.abs(optimal - best);
        var i;
        for (i = 1; i < uniq.length; i++) {
            var d = Math.abs(optimal - uniq[i]);
            if (d < bestD) {
                bestD = d;
                best = uniq[i];
            }
        }
        return best;
    }

    function computeDeliveryMonitorOptimalPageLength($table) {
        var $tbl = $table && $table.length ? $table : $(dmTableLookup);
        var $wrapper = $(dmTableLookup + '_wrapper');
        var $scroll = $wrapper.find('.scrollX.table-responsive-Y');
        if (!$scroll.length) {
            $scroll = $wrapper;
        }
        var scrollEl = $scroll[0];
        var scrollH = scrollEl && scrollEl.clientHeight > 0 ? scrollEl.clientHeight : 0;

        var theadH = $tbl.find('thead').first().outerHeight() || DM_ROW_FALLBACK;
        var rowH = DM_ROW_FALLBACK;
        var $row = $tbl.find('tbody tr').not('.child').first();
        if ($row.length) {
            var rh = $row.outerHeight();
            if (rh && rh > 0) {
                rowH = rh;
            }
        }

        /*
         * Antes do 1º draw o wrapper/.scrollX pode não existir ou ter altura 0; o 1º AJAX com pageLength errado
         * seguido de draw(false) gerava 2 respostas e a sensação de "preenche depois troca as linhas".
         * #dmTableWrap já está no DOM com flex + min-height — aproxima a área útil da tbody sem 2º pedido.
         */
        if (scrollH < 40) {
            var $dmWrap = $('#dmTableWrap');
            var wrapEl = $dmWrap[0];
            if (wrapEl && wrapEl.clientHeight >= 80) {
                var footerInsideGuess = 54;
                var theadGuess = theadH > 0 ? theadH : DM_ROW_FALLBACK;
                scrollH = Math.max(120, wrapEl.clientHeight - footerInsideGuess - theadGuess);
            }
        }

        if (scrollH < 40) {
            var vh = window.innerHeight || document.documentElement.clientHeight || 600;
            var top = 0;
            if (scrollEl && typeof scrollEl.getBoundingClientRect === 'function') {
                top = scrollEl.getBoundingClientRect().top;
            } else {
                var $wrap = $('#dmTableWrap');
                if ($wrap.length && $wrap[0].getBoundingClientRect) {
                    top = $wrap[0].getBoundingClientRect().top;
                }
            }
            var $foot = $wrapper.find('.footer-table');
            var footerH = $foot.length ? ($foot.outerHeight(true) || 52) : 52;
            var pad = 12;
            scrollH = Math.max(120, vh - top - footerH - pad);
        }

        var bodyAvail = Math.max(0, scrollH - theadH - 2);
        var rows = Math.floor(bodyAvail / rowH);
        if (rows < DM_PAGE_LEN_MIN) {
            rows = DM_PAGE_LEN_MIN;
        }
        if (rows > DM_PAGE_LEN_MAX) {
            rows = DM_PAGE_LEN_MAX;
        }
        return rows;
    }

    function applyDeliveryMonitorDynamicPageLength() {
        if (dmUserChosePageLength) {
            return;
        }
        if (dmApplyingDynamicPageLen) {
            return;
        }
        if (!$.fn.dataTable || !$.fn.dataTable.isDataTable(dmTableLookup)) {
            return;
        }
        var $tbl = $(dmTableLookup);
        if (!$tbl.is(':visible') || !$('#dmTableWrap').is(':visible')) {
            return;
        }
        var api = $tbl.DataTable();
        var st = api.settings()[0];
        if (st && st.bProcessing) {
            return;
        }
        var optimal = computeDeliveryMonitorOptimalPageLength($tbl);
        var next = snapDeliveryMonitorPageLenToMenuChoices(optimal, dmLengthMenuDynamicValue);
        if (next === api.page.len()) {
            return;
        }
        dmApplyingDynamicPageLen = true;
        dmProgrammaticPageLenChange = true;
        try {
            window.__dmSuppressNextDataTablesProcessingOverlay = true;
            api.page.len(next).draw(false);
        } finally {
            window.setTimeout(function () {
                dmApplyingDynamicPageLen = false;
                dmProgrammaticPageLenChange = false;
            }, 50);
        }
    }

    function debounceDeliveryMonitorPageLength(fn, waitMs) {
        return function () {
            var ctx = this;
            var args = arguments;
            window.clearTimeout(dmDynamicPageLenResizeTimer);
            dmDynamicPageLenResizeTimer = window.setTimeout(function () {
                fn.apply(ctx, args);
            }, waitMs);
        };
    }

    var scheduleDeliveryMonitorDynamicPageLength = debounceDeliveryMonitorPageLength(function () {
        applyDeliveryMonitorDynamicPageLength();
        if ($.fn.dataTable && $.fn.dataTable.isDataTable(dmTableLookup)) {
            $(dmTableLookup).DataTable().columns.adjust();
        }
    }, 160);

    function initDeliveryMonitorTable(config) {
        if (typeof startTable !== 'function') {
            console.warn('DeliveryMonitor: startTable não encontrado. Inclua ~/Scripts/Tabelas/table-setting.js antes deste arquivo.');
            return;
        }

        dmTableLookup = normalizeDmTableLookup(
            (config && config.tableLookup) || resolveDmTableLookupFromDom()
        );
        if (typeof window !== 'undefined') {
            window.__dmTableLookupActive = dmTableLookup;
        }

        var $table = $(dmTableLookup);

        if (!$table.length || !$.fn.DataTable) {

            return;

        }



        var listUrl = $('#dmDeliveryMonitorRoot').data('dm-list-url');

        if (!listUrl) {

            listUrl = '/notasemitidas/deliverymonitor/getdatapaginated';

        }



        function adjustDeliveryMonitorColumns() {
            if ($.fn.dataTable && $.fn.dataTable.isDataTable(dmTableLookup)) {
                $(dmTableLookup).DataTable().columns.adjust();
            }
        }



        var dmInitialPageLen = clampDeliveryMonitorPageLen(computeDeliveryMonitorOptimalPageLength($table));
        dmLengthMenuDynamicValue = dmInitialPageLen;

        var options = {

            serverSide: true,

            processing: true,

            searching: false,

            /* Ordenação desligada até haver contrato estável com a API; remover ordering:false quando for reativar. */
            ordering: false,

            order: [],

            responsive: false,

            select: false,

            lengthChange: true,

            pageLength: dmInitialPageLen,

            lengthMenu: buildDeliveryMonitorLengthMenu(dmInitialPageLen),

            /* Painel de colunas é o custom #dmColvisPanel (wireDeliveryMonitorColvisButton); sem Buttons no DOM. */
            buttons: [],

            dom: "<'scrollX table-responsive-Y 't><'footer-table'<'d-flex align-items-center flex-wrap w-100'<'show-registers flex-shrink-0 p-l-10'i><'d-flex flex-fill justify-content-center min-w-0 drop'p><'page-results flex-shrink-0 dm-page-length-wrap ml-auto'l>>>",

            /**
             * Substitui o initComplete global de table-setting.js para esta tabela — deve repetir show/hide do loading.
             * data-testid no wrapper / paginação / page length para Playwright.
             */
            initComplete: function () {
                var $main = $('[data-table="' + dmTableLookup + '"]');
                var $tableWrap = $main.find('.table-wrap');
                var $loading = $main.find('.loading-table');
                if ($tableWrap.length) {
                    $tableWrap.show();
                }
                if ($loading.length) {
                    $loading.attr('data-testid', 'deliverymonitor-datatable-loading-overlay');
                    $loading.hide();
                }
                var $w = $(dmTableLookup + '_wrapper');
                if ($w.length) {
                    $w.attr('data-testid', 'deliverymonitor-datatable-wrapper');
                    var $len = $w.find('.dm-page-length-wrap select').first();
                    if ($len.length) {
                        $len.attr('data-testid', 'deliverymonitor-page-length');
                    }
                    var $drop = $w.find('.footer-table .drop').first();
                    if ($drop.length) {
                        $drop.attr('data-testid', 'deliverymonitor-datatable-pagination');
                    }
                    var $info = $w.find('.footer-table .show-registers').first();
                    if ($info.length) {
                        $info.attr('data-testid', 'deliverymonitor-datatable-info');
                    }
                }
            },

            createdRow: function (row, data) {
                var nfe = data && data.nfe != null && data.nfe !== '' ? String(data.nfe).trim() : '';
                if (nfe) {
                    $(row).attr('data-dm-nfe', nfe);
                }
            },

            ajax: {

                url: listUrl,

                type: 'POST',

                data: function (d) {

                    var dadosFiltros =

                        typeof window.getDeliveryMonitorDadosFiltros === 'function'

                            ? window.getDeliveryMonitorDadosFiltros()

                            : (typeof window.getDeliveryMonitorGridExtras === 'function'

                                ? window.getDeliveryMonitorGridExtras()

                                : {});

                    d.dtEmissaoDe = dadosFiltros.dtEmissaoDe;

                    d.dtEmissaoAte = dadosFiltros.dtEmissaoAte;

                    if (dadosFiltros.empresaId != null && dadosFiltros.empresaId !== undefined) {

                        d.empresaId = dadosFiltros.empresaId;

                    }

                    d.cnpjDestinatario = dadosFiltros.cnpjDestinatario;

                    d.nomeDestinatario = dadosFiltros.nomeDestinatario;

                    d.cnpjTransportador = dadosFiltros.cnpjTransportador;

                    d.nomeTransportador = dadosFiltros.nomeTransportador;

                    if (dadosFiltros.status != null && dadosFiltros.status !== undefined) {

                        d.status = dadosFiltros.status;

                    }

                    d.incluirFiliais = !!dadosFiltros.incluirFiliais;

                    d.dataEntregaDe = dadosFiltros.dataEntregaDe;

                    d.dataEntregaAte = dadosFiltros.dataEntregaAte;

                    d.dataRecusaDe = dadosFiltros.dataRecusaDe;

                    d.dataRecusaAte = dadosFiltros.dataRecusaAte;

                    d.categoriaJson = dadosFiltros.categoriaJson;

                    d.search = { value: '', regex: false, smart: false };

                    if ($.isArray(d.columns)) {

                        d.columns.forEach(function (col) {

                            if (col.search) {

                                col.search.value = '';

                            }

                        });

                    }

                    /* &quot;Todos&quot;: força o sentinela no POST (page.len() pode não ser -1 em algumas versões do DT). */
                    if ($.fn.dataTable && $.fn.dataTable.isDataTable(dmTableLookup)) {
                        var dmCurLen = $(dmTableLookup).DataTable().page.len();
                        if (dmCurLen === DM_PAGE_LEN_TODOS_SENTINEL || dmCurLen === -1) {
                            d.length = DM_PAGE_LEN_TODOS_SENTINEL;
                        }
                    }

                    return d;

                },

                dataSrc: function (json) {

                    if (json && $.isArray(json.data)) {

                        return json.data;

                    }

                    return [];

                },

                error: function (xhr) {

                    console.warn('DeliveryMonitor: erro ao listar', xhr.status, xhr.statusText);

                }

            },

            columns: [

                {
                    title: 'STATUS',
                    data: 'status',
                    name: 'status',
                    defaultContent: '—',
                    className: 'text-center dm-col-status',
                    render: function (data, type) {
                        if (type !== 'display') {
                            var meta = getDeliveryMonitorStatusMeta(data);
                            return meta.label;
                        }
                        return buildDeliveryMonitorStatusCell(data);
                    }
                },

                {
                    title: 'NÚMERO/SÉRIE',
                    data: 'nfe',
                    name: 'nrDocumento',
                    align: 'center',
                    width: '240px',
                    defaultContent: '—',
                    className: 'p-0 bd-0 text-center  no-title container-details nfeentrada-col-status-acoes noVis dm-col-nfe-acoes',
                    render: function (data, type, row) {
                        if (type !== 'display') {
                            return buildDeliveryMonitorNfeDisplay(data, row);
                        }
                        return buildDeliveryMonitorNfeCell(data, row);
                    }
                },

                {
                    title: 'EMITENTE',
                    data: 'nomeEmitente',
                    name: 'nomeEmitente',
                    defaultContent: '—',
                    className: 'dm-col-emitente'
                },

                {
                    title: 'DESTINATÁRIO',
                    data: 'cliente',
                    name: 'nomeDestinatario',
                    defaultContent: '—',
                    className: 'dm-col-cliente',
                    width: '180px',
                    render: function (data, type) {
                        return buildDeliveryMonitorDestinatarioCell(data, type);
                    }
                },

                {
                    title: 'TRANSPORTADORA',
                    data: 'nomeTransportadora',
                    name: 'nomeTransportadora',
                    defaultContent: '—',
                    className: 'dm-col-transportadora'
                },

                { title: 'DATA ENTREGA', data: 'dataEntrega', name: 'dhEntrega', defaultContent: '—', className: 'text-center', align: 'center' },

                { title: 'DATA ENTREGA EFETIVA', data: 'dataEntregaEfetiva', name: 'dataAceiteEfetiva', defaultContent: '—', className: 'text-center', align: 'center' },

                { title: 'DATA RECUSA', data: 'dataRecusa', name: 'dhRecusa', defaultContent: '—', className: 'text-center', align: 'center' },

                { title: 'DATA RECUSA EFETIVA', data: 'dataRecusaEfetiva', name: 'dataRecusaEfetiva', defaultContent: '—', className: 'text-center', align: 'center' },

                { title: 'DATA PREVISTA', data: 'dataPrevista', name: 'dhPrevistaEntrega', defaultContent: '—', className: 'text-center', align: 'center' },

                { title: 'ORIGEM', data: 'origem', name: 'cidadeUfOrigem', defaultContent: '—' },

                { title: 'DESTINO', data: 'destino', name: 'cidadeUfDestino', defaultContent: '—', className: 'text-center', align: 'center' },

                {
                    title: 'ENVIADO',
                    data: 'enviado',
                    name: 'enviadoSistDestino',
                    defaultContent: '—',
                    className: 'text-center',
                    align: 'center',
                    render: function (data, type, row) {
                        if (type !== 'display') {
                            return getDeliveryMonitorEnviadoMeta(row).label;
                        }
                        return buildDeliveryMonitorEnviadoDotCell(row);
                    }
                },

                {
                    title: 'RECEBIDO',
                    data: 'recebido',
                    name: 'recebidoSistDestino',
                    defaultContent: '—',
                    className: 'text-center',
                    align: 'center',
                    render: function (data, type) {
                        if (type !== 'display') {
                            return getDeliveryMonitorRecebidoMeta(data).label;
                        }
                        return buildDeliveryMonitorRecebidoDotCell(data);
                    }
                },

                {
                    title: 'ATRASO',
                    data: 'diasEmAtraso',
                    name: 'diasEmAtraso',
                    defaultContent: '—',
                    orderable: false,
                    className: 'text-center',
                    align: 'center',
                    render: function (data, type, row) {
                        if (type !== 'display') {
                            var n = resolveDeliveryMonitorDiasEmAtraso(row);
                            return n != null ? String(n) : (row && row.atraso != null ? String(row.atraso) : '');
                        }
                        return formatDeliveryMonitorDiasAtrasoCell(row);
                    }
                },

                {
                    title: 'CHAVE NFE',
                    data: 'chaveAcessoNfe',
                    name: 'chaveAcessoNfe',
                    defaultContent: '—',
                    className: 'dm-col-chave-nfe',
                    render: function (data, type) {
                        if (type !== 'display') {
                            return data == null || data === '' ? '' : String(data);
                        }
                        return buildDeliveryMonitorTooltipTextCell(data);
                    }
                }

            ]

        };



        startTable(dmTableLookup, options);

        $(dmTableLookup).on('draw.dt.dmTbodyTestId', function () {
            var $tb = $(dmTableLookup + ' tbody');
            if ($tb.length) {
                $tb.attr('data-testid', 'deliverymonitor-datatable-tbody');
            }
        });

        /* Dispara já para o header poder adiar métricas/filtros sem esperar mais um frame. */
        $(document).trigger('deliveryMonitor:dataTableReady');

        /*
         * ColVis: monta o painel e handlers só quando o browser estiver ocioso (ou ~180ms), ou ao hover/focus no botão.
         * Evita trabalho pesado no mesmo instante do 1.º POST da grid.
         */
        var dmColvisWired = false;
        function ensureDeliveryMonitorColvisWired() {
            if (dmColvisWired || !$.fn.dataTable || !$.fn.dataTable.isDataTable(dmTableLookup)) {
                return;
            }
            dmColvisWired = true;
            wireDeliveryMonitorColvisButton();
        }
        function scheduleDeliveryMonitorColvisWire() {
            function run() {
                ensureDeliveryMonitorColvisWired();
            }
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(run, { timeout: 450 });
            } else {
                window.setTimeout(run, 180);
            }
        }
        $('#btnOcultarColunas')
            .off('.dmColvisLazy')
            .on('mouseenter.dmColvisLazy focusin.dmColvisLazy touchstart.dmColvisLazy', function () {
                ensureDeliveryMonitorColvisWired();
            });
        scheduleDeliveryMonitorColvisWire();

        $table.off('length.dt.dmUserChoice').on('length.dt.dmUserChoice', function () {
            if (dmProgrammaticPageLenChange) {
                return;
            }
            dmUserChosePageLength = true;
        });

        /* Sem ajuste no 1º XHR: page.len().draw(false) após a 1ª resposta trocava o conjunto de linhas (2 AJAX). */
        /*
         * Sem ResizeObserver em #dmTableWrap: esconder/mostrar o wrap no loading (table-setting) e trocar linhas
         * após draw(false) alteravam o box e disparavam page.len().draw(false) de novo — segundo AJAX ao mudar data.
         * Ajuste de linhas por altura: janela (resize) + deliveryMonitor:recalcPageLength (painel métricas / Filtrar por).
         */
        $(document).off('deliveryMonitor:recalcPageLength.dm').on('deliveryMonitor:recalcPageLength.dm', function () {
            scheduleDeliveryMonitorDynamicPageLength();
        });

        var $dmSearch = $('#dmGridSearch');

        if ($dmSearch.length) {

            var runVisibleOnlySearch = debounceDeliveryMonitor(function () {
                applyDeliveryMonitorVisibleRowsLocalFilter();
            }, 200);

            $dmSearch.off('input.dmClearBtn').on('input.dmClearBtn', syncDeliveryMonitorSearchClearButton);

            $dmSearch.off('keyup.dmVisible change.dmVisible input.dmVisible')
                .on('keyup.dmVisible change.dmVisible input.dmVisible', runVisibleOnlySearch);

            $('#dmGridSearchClear').off('click.dmClear').on('click.dmClear', function () {
                $dmSearch.val('');
                syncDeliveryMonitorSearchClearButton();
                applyDeliveryMonitorVisibleRowsLocalFilter();
            });

            $table.off('draw.dt.dmVisibleFilter').on('draw.dt.dmVisibleFilter', function () {
                window.setTimeout(applyDeliveryMonitorVisibleRowsLocalFilter, 0);
            });

            window.setTimeout(function () {
                syncDeliveryMonitorSearchClearButton();
                refreshDeliveryMonitorGridFooterInfo();
            }, 0);
        }



        /** Ajuste de colunas após draw (Responsive). Com 0 linhas o thead é ocultado em table-setting.js ($header pós-init). */

        function scheduleDeliveryMonitorAfterDraw() {

            function runAfterDraw() {

                if (!$.fn.dataTable.isDataTable(dmTableLookup)) {

                    return;

                }

                if ($table.DataTable().rows().count() > 0) {

                    adjustDeliveryMonitorColumns();

                }

            }

            /* Dois rAF alinham ao paint; um timeout curto cobre fontes/layout tardio — menos reflows que 4 timeouts. */
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(function () {
                    window.requestAnimationFrame(runAfterDraw);
                });
            } else {
            window.setTimeout(runAfterDraw, 0);
            }

            window.setTimeout(runAfterDraw, 100);

        }



        $table.off('draw.dt.deliveryMonitorLoading').on('draw.dt.deliveryMonitorLoading', scheduleDeliveryMonitorAfterDraw);

        function triggerDeliveryMonitorRowActionFromEl($el) {
            if (!$.fn.dataTable.isDataTable(dmTableLookup)) {
                return;
            }
            var $action = $el;
            var action = $el.data('dm-action');
            var rowData = $table.DataTable().row($el.closest('tr')).data();
            var chaveAcesso = ($action.attr('data-dm-chave-acesso') || '').trim();
            if (chaveAcesso) {
                rowData = $.extend(true, {}, rowData || {}, { chaveAcessoNfe: chaveAcesso });
            }
            handleDeliveryMonitorRowAction(action, rowData || {});
        }

        $table.off('click.dmRowActions', '[data-dm-action]').on('click.dmRowActions', '[data-dm-action]', function (e) {
            e.preventDefault();
            e.stopPropagation();
            triggerDeliveryMonitorRowActionFromEl($(this));
        });

        $table.off('keydown.dmRowActions', '[data-dm-action][role="button"]').on('keydown.dmRowActions', '[data-dm-action][role="button"]', function (e) {
            var key = e.key || e.which;
            if (key !== 'Enter' && key !== ' ' && e.keyCode !== 13 && e.keyCode !== 32) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            triggerDeliveryMonitorRowActionFromEl($(this));
        });

        $table.off('responsive-resize.dt.deliveryMonitor responsive-display.dt.deliveryMonitor')

            .on('responsive-resize.dt.deliveryMonitor responsive-display.dt.deliveryMonitor', scheduleDeliveryMonitorAfterDraw);



        scheduleDeliveryMonitorAfterDraw();



        $(window).off('resize.deliveryMonitorTable').on('resize.deliveryMonitorTable', function () {
            scheduleDeliveryMonitorDynamicPageLength();
        });

    }



    if (typeof jQuery !== 'undefined') {
        window.openDeliveryMonitorDetalhes = openDeliveryMonitorDetalhes;
        window.openDeliveryMonitorDocumento = openDeliveryMonitorDocumento;
        window.cancelDeliveryMonitorDocumento = cancelDeliveryMonitorDocumento;
        window.initDeliveryMonitorTable = initDeliveryMonitorTable;
        window.getDeliveryMonitorTableLookup = function () {
            return dmTableLookup;
        };
        $(function () {
            initDeliveryMonitorTable();
        });
    }

})();


