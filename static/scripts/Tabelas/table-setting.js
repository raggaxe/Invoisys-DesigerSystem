/* ==========================
   TOOLTIPS USAGE
   ========================== */
function tooltipConfig() {

    $('[data-toggle="tooltip"]').each(function () {

        const type = $(this).data('tooltip-type');
        let tpl =
            '<div class="tooltip" role="tooltip">' +
            '  <div class="tooltip-arrow"></div>' +
            '  <div class="tooltip-inner"></div>' +
            '</div>';

        if (type === 'alerta') {
            tpl = tpl.replace('tooltip"', 'tooltip tooltip-alerta"');
        }

        if (type === 'erro') {
            tpl = tpl.replace('tooltip"', 'tooltip tooltip-erro"');
        }

        $(this).tooltip({
            template: tpl
        });
    });
}


/* ==========================
   CHECKBOX
   ========================== */

// Função para manipular a seleção mestre
function setupMasterCheckbox($dataTable) {
    const tableApi = $dataTable.DataTable();
    const $masterCheckboxContainer = $dataTable.find('th').first().find('.selectRows');
    //console.log($masterCheckboxContainer)
    const $masterCheckboxIcon = $masterCheckboxContainer.find('.checkUncheck');

    // 1. Manipulador de clique no cabeçalho
    $masterCheckboxContainer.off('click.master').on('click.master', function (e) {
        e.preventDefault();

        // Determina o estado atual do checkbox: Se tem fa-square-o, significa que está desmarcado
        const currentlyUnchecked = $masterCheckboxIcon.hasClass('fa-square-o');

        if (currentlyUnchecked) {
            // Se estiver desmarcado, seleciona tudo
            tableApi.rows({ page: 'all' }).select();
        } else {
            // Se estiver marcado, deseleciona tudo
            tableApi.rows({ page: 'all' }).deselect();
        }
    });

    // 2. Evento para manter o ícone do master checkbox sincronizado
    // Sempre que a seleção muda (select.dt / deselect.dt), verificamos a contagem total
    $dataTable.off('select.master deselect.master').on('select.dt.master deselect.dt.master', function () {
        const selectedCount = tableApi.rows({ selected: true, page: 'all' }).count();
        const totalCount = tableApi.rows({ page: 'all' }).count();

        // Limpa classes
        $masterCheckboxIcon.removeClass('fa-square-o fa-check-square-o fa-minus-square-o');

        if (selectedCount === 0) {
            // Nenhuma linha selecionada
            $masterCheckboxIcon.addClass('fa-square-o');
        } else if (selectedCount === totalCount) {
            // Todas as linhas selecionadas
            $masterCheckboxIcon.addClass('fa-check-square-o');
        } else {
            // Seleção parcial (algumas linhas)
            $masterCheckboxIcon.addClass('fa-minus-square-o');
        }

        // Chamada para sua função de atualização do cabeçalho de itens selecionados (opcional)
        // updateSelectedItemsDisplay($dataTable, $('#seuContainerAqui')); 
    });
}


/* ==========================
  TEMPLATES 
   ========================== */

function noRecordsHtml(mainContainer) {
    const $container = mainContainer;
    const $table = mainContainer.find('table.table');
    const containerHeight = $container.height() || 0;
    const headerHeight = $table.find('thead').outerHeight() || 0;
    const $footer = $container.find('.footer-table');
    const footerHeight = $footer.length ? $footer.outerHeight() : 80;
    const paddingReserve = 24;
    const availableHeight = Math.max(200, containerHeight - headerHeight - footerHeight - paddingReserve);

    return `
  <div class="empty-data-custom empty-state-container" style="min-height:${availableHeight}px">
        
            <div class="empty-item" style="width:300px; min-height:${availableHeight}px" >
                <i class="fa fa-search  empty-icon"  style="color: #EAEFF5; font-size:50px;margin-bottom:20px;"></i>
                <div class="heading-md fw-bold">Nenhum Registro Encontrado.</div>
                <div class="heading-sm">A sua busca ou filtro atual não retornou resultados.</div>
                <div class="heading-sm">Verifique os filtros aplicados e tente novamente.</div>
            </div>
           

      
    </div>
`;
}

// VARIÁVEL 2: BUSCA/FILTRO VAZIO (sZeroRecords)
function emptySearchHtml(mainContainer) {
    const $container = mainContainer;
    const $table = mainContainer.find('table.table');
    const containerHeight = $container.height() || 0;
    const headerHeight = $table.find('thead').outerHeight() || 0;
    const $footer = $container.find('.footer-table');
    const footerHeight = $footer.length ? $footer.outerHeight() : 80;
    const paddingReserve = 24;
    const availableHeight = Math.max(200, containerHeight - headerHeight - footerHeight - paddingReserve);
    return `
    <div class="empty-data-custom empty-state-container empty-search-state" style="min-height:${availableHeight}px">
        <div class="empty-card" style="min-height:${availableHeight}px">
            
            <i class="fa fa-filter mb-4 empty-icon" style="color: #EAEFF5; font-size:30px;"></i>
            
            <div class="empty-title mt-4">Nenhum Resultado Encontrado.</div>
            
            <div class="empty-subtitle">
                A sua busca não retornou nenhum registro. Tente ajustar os termos de pesquisa, limpar os filtros aplicados ou verificar a ortografia.
            </div>
            
        </div>
    </div>
`;
}


// ATENÇÃO: Verifique se a variável 'baseUrl' está definida no escopo
const imageUrl = '/Images/loader.gif';

const loadingHtml = `
    <div class="loading-table">
      
            <img src="${imageUrl}" width="75" /> 
            <div class="heading-md fw-bold">
                Carregando Aguarde....
            </div>
       
    </div>`;


/* ==========================
   FILTROS
   ========================== */


function buildFilterBody($item) {

    const dropdown = $item.find('.filter-button');
    const search = $item.find('.search-input');
    //console.log(search.attr("placeholder"))
    const textContent = dropdown.html() ?? '';
    const placeholder = search.attr("placeholder") ?? '';

    return ` 
    <div class="col-sm-12">
                        <div class="form-group">
                            <label class="form-label" for="${textContent}">${textContent}</label>
                            <input id="${textContent}" type="text" class="search-input" placeholder="${placeholder}">
                        </div>
                    </div>`;
}



function getSortDirection(d) {
    if (d.order && d.order.length > 0) {
        return d.order[0].dir.toUpperCase() === 'ASC' ? 'Asc' : 'Desc';
    }
    return 'Desc';
}
//function clearDateRangePicker() {
//    $('.date-range-input').val("");
//}

// Função para obter os filtros ativos de um dropdown específico
function getActiveFilters(dropdownId) {
    // 1. Verifica se o elemento dropdown existe
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.warn(`Elemento com ID '${dropdownId}' não encontrado.`);
        return []; // Retorna um array vazio se o elemento principal não existir
    }

    // 2. Procura por todos os elementos de opção. 
    // querySelectorAll SEMPRE retorna uma NodeList, mesmo que vazia, nunca null.
    const options = dropdown.querySelectorAll('.dropdown-option .option-text');

    const filters = [];

    // 3. Verifica o tamanho da NodeList retornada e itera
    if (options.length > 0) {

        options.forEach(option => {
            // Se o conteúdo for texto, o trim() é seguro.
            // Se for undefined ou null (o que não deve acontecer com textContent), pode causar erro.
            // Usamos o operador de coalescência nula (?? '') para garantir que não tentamos trim() em null/undefined.
            const textContent = option.textContent ?? '';
            filters.push(textContent.trim());
        });
    }

    // Se options.length for 0, retorna filters (que é um array vazio: [])

    return filters;
}


/**
 * Opções de UI da grade (não são opções do DataTables). Passar em specificOptions.invTableUi
 * e são removidas antes do $.extend final para o DataTable.
 *
 * dynamicPageLengthMode:
 *   - measureFooter: usa altura de .footer-table no DOM (padrão).
 *   - fixedReserve: reservas fixas (rodapé 80px + padding 36px) para layouts tipo NFe Beta.
 *
 * pageLengthClamp: { min, subtractAfterMeasure } — ex.: { min: 10, subtractAfterMeasure: 1 }.
 *
 * processingOverlaySuppressFlag: nome em window; se true no processing, não esconde wrap/loading (outras telas).
 * Delivery Monitor: ramo em startTable ([data-dm-datatable="delivery-monitor"] + __dmSuppressNextDataTablesProcessingOverlay).
 * NF-e Entrada Beta — grade principal: defaults invTableUi aplicados quando [data-table="#tblNFe"] (sem declarar em table-init.js).
 *
 * afterDraw / onDataTableError: opcionais; Delivery não precisa — comportamento dedicado no motor.
 */
function getNFeEntradaBetaMainGridInvTableUi() {
    return {
        dynamicPageLengthMode: 'fixedReserve',
        pageLengthMenu: [10, 20, 50, 100, -1],
        pageLengthClamp: { min: 10, subtractAfterMeasure: 1 },
        zeroRecordsSameAsEmptyTable: true,
        deferInitialTableReveal: true,
        loadingHiddenCssClass: 'nfeentrada-loading-oculto',
        keepSelectionOnRedraw: true,
        emptyStateWrapClass: 'nfeentrada-grid-empty'
    };
}

function getInvTableUiDefaults() {
    return {
        dynamicPageLengthMode: 'measureFooter',
        pageLengthMenu: [20, 50, 100, -1],
        pageLengthClamp: null,
        zeroRecordsSameAsEmptyTable: false,
        deferInitialTableReveal: false,
        loadingHiddenCssClass: null,
        keepSelectionOnRedraw: false,
        emptyStateWrapClass: null,
        processingOverlaySuppressFlag: null,
        afterDraw: null,
        onDataTableError: null
    };
}

function resolveMasterCheckboxControls($mainContainer) {
    var $icon = $mainContainer.find('#checkUncheck');
    if (!$icon.length) {
        $icon = $('#checkUncheck');
    }
    var $btn = $mainContainer.find('#selectRows');
    if (!$btn.length) {
        $btn = $('#selectRows');
    }
    return { $checkIcon: $icon, $selectRows: $btn };
}

/** Delivery Monitor: tooltip verde Bootstrap; outras grades: title nativo. */
function invTableUpdateSelectRowsHint($btn, text, isDeliveryMonitorGrid) {
    if (!$btn || !$btn.length) {
        return;
    }
    if (isDeliveryMonitorGrid && $btn.is('[data-toggle="tooltip"]')) {
        $btn.removeAttr('title');
        $btn.attr('data-original-title', text);
        if (typeof window.applyDeliveryMonitorToolbarHintTooltip === 'function') {
            window.applyDeliveryMonitorToolbarHintTooltip($btn);
        }
    } else {
        $btn.prop('title', text);
    }
}

function getDynamicPageLength(mainContainer, min, invTableUi) {
    if (min === undefined || min === null) {
        min = 5;
    }
    invTableUi = invTableUi || getInvTableUiDefaults();

    const $container = mainContainer;
    const $table = mainContainer.find('table.table');

    const containerHeight = $container.height() || 0;
    const headerHeight = $table.find('thead').outerHeight() || 0;

    let footerReserve = 0;
    let paddingReserve = 8;
    if (invTableUi.dynamicPageLengthMode === 'fixedReserve') {
        footerReserve = 80;
        paddingReserve = 36;
    } else {
        const $footer = $container.find('.footer-table');
        if ($footer.length) {
            footerReserve = $footer.outerHeight() || 50;
        }
    }

    let rowHeight = $table.find('tbody tr:first').outerHeight();
    if (!rowHeight) {
        rowHeight = 42;
    }

    const availableHeight = Math.max(0, containerHeight - headerHeight - footerReserve - paddingReserve);
    const rows = Math.floor(availableHeight / rowHeight);

    return Math.max(rows, min);
}


/* ==========================
   TABLE START INIT GERAL
   ========================== */

let lastSearchValue = '';

const TOOLTIP_OPTIONS = {
    container: 'body',
};

const MAX_CHARS = 25;

function startTable(lookupSelector, specificOptions, searchSelector) {
    //console.log(`Inicializando tabela: ${$table.attr('id')}`);



    const mainContainer = $(`[data-table="${lookupSelector}"]`);
    const $table = mainContainer.find('table.table');
    const isDeliveryMonitorGrid = mainContainer.is('[data-dm-datatable="delivery-monitor"]');
    const isNFeEntradaBetaMainGrid = mainContainer.is('[data-table="#tblNFe"]');

    const specificOptionsForDt = $.extend(true, {}, specificOptions || {});
    const invTableUi = $.extend(
        true,
        {},
        getInvTableUiDefaults(),
        isNFeEntradaBetaMainGrid ? getNFeEntradaBetaMainGridInvTableUi() : {},
        specificOptionsForDt.invTableUi || {}
    );
    delete specificOptionsForDt.invTableUi;



    if ($.fn.DataTable.isDataTable($table)) {
        $table.DataTable().destroy();
    }


    const $tableWrap = mainContainer.find('.table-wrap'); // CORRIGIDO

    // 3. Ação: Insere o HTML de loading APÓS o table-wrap só se ainda não existir (NFe Entrada Beta já traz loading na view para estado inicial)
    if ($tableWrap.length && !mainContainer.find('.loading-table').length) {
        $tableWrap.after(loadingHtml);
    }

    const $loading = mainContainer.find('.loading-table');

    const selectedContainer = mainContainer.find('.selected-items-container'); // CORRIGIDO
    selectedContainer.hide();
    const $panelFilterRow = mainContainer.find('#panel-filter-row');

    const $bodyFilter = mainContainer.find(".filter-body");
    const closefilter = mainContainer.find(".close-filter");


    $tableWrap.hide();
    if (invTableUi.loadingHiddenCssClass) {
        $loading.removeClass(invTableUi.loadingHiddenCssClass);
    }
    $loading.show();

    let pageLengthDynamic;
    if (invTableUi.pageLengthClamp) {
        const cmin = invTableUi.pageLengthClamp.min != null ? invTableUi.pageLengthClamp.min : 5;
        const sub = invTableUi.pageLengthClamp.subtractAfterMeasure || 0;
        pageLengthDynamic = Math.max(cmin, getDynamicPageLength(mainContainer, cmin, invTableUi) - sub);
    } else {
        pageLengthDynamic = getDynamicPageLength(mainContainer, 5, invTableUi);
    }

    const menuValues = invTableUi.pageLengthMenu.slice();
    if (!menuValues.includes(pageLengthDynamic)) {
        menuValues.unshift(pageLengthDynamic); // adiciona ao início se não existir
    }

    const emptyStateNoRecordsHtml = noRecordsHtml(mainContainer);
    const zeroRecordsLanguageHtml = invTableUi.zeroRecordsSameAsEmptyTable
        ? emptyStateNoRecordsHtml
        : emptySearchHtml(mainContainer);

    // --- 1. CONFIGURAÇÕES PADRÃO (Comuns a todas as tabelas) ---
    const defaultSettings = {
        serverSide: true,
        processing: true,
        responsive: false,


        "columnDefs": [{
            'targets': '_all',
            visible: true
        }],
        searching: false,


        lengthMenu: [
            menuValues,
            menuValues.map(v => v === -1 ? "Todos" : v)
        ],
        pageLength: pageLengthDynamic,

        dom: "<'scrollX table-responsive-Y 't><'footer-table'<'d-flex justify-content-center align-items-center'<'show-registers p-l-10'i><'flex-fill d-flex justify-content-center align-itemns-center drop'p><'page-results'l>>>",

        language: {
            "sEmptyTable": emptyStateNoRecordsHtml,
            "sInfo": "<div>Mostrando de _START_ até _END_ de _TOTAL_ registros</div>",
            "sInfoEmpty": "<div>Mostrando 0 até 0 de 0 registros</div>",
            "sInfoFiltered": "(Filtrados de _MAX_ registros)",
            "sLengthMenu": "<div>Exibindo _MENU_ resultados por página</div>",
            "sLoadingRecords": "Carregando...",
            "sProcessing": "",
            "sZeroRecords": zeroRecordsLanguageHtml,
            "sSearch": "",
            "sSearchPlaceholder": "Pesquise...",
            "oPaginate": { "sNext": "Próxima", "sPrevious": "Anterior", "sFirst": "Primeira", "sLast": "Última" },
            "oAria": { "sSortAscending": ": Ordenar colunas de forma ascendente", "sSortDescending": ": Ordenar colunas de forma descendente" },
            "select": { "rows": "" }
        },

        // Outras configurações padrão

        select: { "style": "multi", selector: 'td.selectable', "items": "row", className: 'bg-row-selected' },
        buttons: [
            {
                extend: 'colvis',
                columns: ':not(.noVis)',
                text: 'Editar colunas',
                className: 'link-acao',
                postfixButtons: [{ extend: 'colvisRestore', text: 'Mostrar Todas' }]
            }
        ],

        // --- 2. HOOKS E LÓGICA DE SINCRONIZAÇÃO DE CABEÇALHO (Fixas) ---

        // Função que sincroniza a largura da tabela fixa (SE USAR A SOLUÇÃO HÍBRIDA)
        initComplete: function () {
            if (!invTableUi.deferInitialTableReveal) {
                $tableWrap.show();
                $loading.hide();
            }
        },

    };

    // --- 3. COMBINAR CONFIGURAÇÕES ---
    // Mescla as configurações padrão com as configurações específicas (colunas, ajax)
    const finalSettings = $.extend(true, {}, defaultSettings, specificOptionsForDt);
    // $.extend(true) funde arrays por índice — lengthMenu do DataTables (matriz 2×N) corrompe-se
    // se a tabela passa lengthMenu/pageLength próprios (ex.: Delivery Monitor).
    if (Object.prototype.hasOwnProperty.call(specificOptionsForDt, 'lengthMenu')) {
        finalSettings.lengthMenu = specificOptionsForDt.lengthMenu;
    }
    if (Object.prototype.hasOwnProperty.call(specificOptionsForDt, 'pageLength')) {
        finalSettings.pageLength = specificOptionsForDt.pageLength;
    }
    if (Object.prototype.hasOwnProperty.call(specificOptionsForDt, 'buttons')) {
        finalSettings.buttons = specificOptionsForDt.buttons;
    }
    // columnDefs: concatenar os da tabela específica aos padrão (evita perder targets: '_all' e garante noVis etc.)
    if (specificOptionsForDt.columnDefs && specificOptionsForDt.columnDefs.length) {
        const defaultDefs = (defaultSettings.columnDefs && defaultSettings.columnDefs.length) ? defaultSettings.columnDefs : [];
        finalSettings.columnDefs = defaultDefs.concat(specificOptionsForDt.columnDefs);
    }
    // Opção de UI: seletor do botão que dispara ColVis (ex.: #btnOcultarColunas). Não é opção do DataTable.
    const colvisTriggerSelector = finalSettings.colvisTriggerSelector;
    delete finalSettings.colvisTriggerSelector;
    const searchClientSideOnly = finalSettings.searchClientSideOnly === true;
    delete finalSettings.searchClientSideOnly;
    // Incluir 'B' (Buttons) no dom para o ColVis ser criado e o dropdown funcionar
    if (colvisTriggerSelector && finalSettings.dom) {
        finalSettings.dom = 'B' + finalSettings.dom;
    }

    // 1. BUSCA DINÂMICA DO WRAPPER E LOADING (Correto para a sua estrutura)
    // 1. BUSCA DINÂMICA (Correto, mantenha esta lógica)


    function dataTableAdjustResponsiveSafe(dtApi) {
        if (!dtApi) {
            return;
        }
        dtApi.columns.adjust();
        if (dtApi.responsive && typeof dtApi.responsive.recalc === 'function') {
            dtApi.responsive.recalc();
        }
    }

    // --- 4. INICIALIZAR E ADICIONAR EVENTOS (Eventos padrão) ---
    const dataTable = $table.DataTable(finalSettings)
        .on('processing.dt', function (e, settings, processing) {
            // Lógica de processamento e loading
            const tableApi = $(this).DataTable();
            const currentSearchValue = tableApi.search();
            const isFiltering = currentSearchValue !== lastSearchValue && currentSearchValue.length > 0;
            if (currentSearchValue !== lastSearchValue) { lastSearchValue = currentSearchValue; }
            const $wrapper = $table.closest('.dataTables_wrapper');
            // Nunca usar .dataTables_info.closest('.row') — sobe ao .row Bootstrap da página (Delivery/NFe).
            const $footerBar = $wrapper.find('.footer-table').first();
            const suppressKey = invTableUi.processingOverlaySuppressFlag;
            const skipDmOverlay =
                isDeliveryMonitorGrid && window.__dmSuppressNextDataTablesProcessingOverlay === true;
            const skipOverlay =
                (suppressKey &&
                    typeof window[suppressKey] !== 'undefined' &&
                    window[suppressKey] === true) ||
                skipDmOverlay;
            if (processing) {
                if (!skipOverlay) {
                    if (invTableUi.loadingHiddenCssClass) {
                        $loading.removeClass(invTableUi.loadingHiddenCssClass);
                    }
                    $loading.show();
                    $tableWrap.hide();
                    if ($footerBar.length) {
                        $footerBar.hide();
                    }
                }
            } else {
                if (suppressKey && window[suppressKey]) {
                    window[suppressKey] = false;
                }
                if (isDeliveryMonitorGrid && window.__dmSuppressNextDataTablesProcessingOverlay === true) {
                    window.__dmSuppressNextDataTablesProcessingOverlay = false;
                }
            }





            dataTableAdjustResponsiveSafe($(this).DataTable());
        })
        .on('draw.dt', function (e, settings, processing) {
            const $wrapper = $table.closest('.dataTables_wrapper');
            const $searchFilter = $wrapper.find('.header-result')
            const $footer = $wrapper.find('.footer-table')

            //$tableWrap.css("visibility", "visible")
            //$tableWrap.css("display", "flex");
            //$tableWrap.removeClass('table-is-collapsed');
            //$tableWrap.addClass('table-wrap');
            $searchFilter.show();
            //var $tableWrap = $(this).closest('.table-wrap');
            /*  console.log("drawer")
              // Lógica de desenho da tabela
              
              const $tableWrap = $(`.table-wrap[data-loading="${lookupSelector}`);
              console.log($tableWrap)
              ;*/

            // ... (Restante da sua lógica de draw.dt e checkbox)

            $loading.hide();
            if (invTableUi.loadingHiddenCssClass) {
                $loading.addClass(invTableUi.loadingHiddenCssClass);
            }
            //$table.show();
            //$tableWrap.css("block-size", "100%")consoconso
            $tableWrap.show()

            const table = $table.DataTable();
            if (!invTableUi.keepSelectionOnRedraw && finalSettings.select) {
                try {
                    table.rows({ selected: true }).deselect();
                } catch (ignore) {
                    /* select: false — API de seleção indisponível */
                }
            }

            $table.find('.action-buttons-group').css('display', 'none');
            $('.no-title').prop("title", "");

            if (typeof initCustomTooltips === 'function') { initCustomTooltips(); }
            if (isDeliveryMonitorGrid) {
                var dmChaveNfeTooltipTemplate =
                    '<div class="tooltip dm-tooltip-chave-nfe-bubble" role="tooltip">' +
                    '<div class="tooltip-arrow"></div>' +
                    '<div class="tooltip-inner"></div>' +
                    '</div>';
                $table.find('.dm-tooltip-chave-nfe').each(function () {
                    var $chaveEl = $(this);
                    if ($chaveEl.data('bs.tooltip')) {
                        $chaveEl.tooltip('destroy');
                    }
                });
                /* Só células da tabela — cartão verde (.dm-toolbar-hint-tooltip); função exposta em delivery-monitor-header.js */
                $table.find('[data-toggle="tooltip"]').not('.dm-tooltip-chave-nfe').each(function () {
                    var $x = $(this);
                    if (typeof window.applyDeliveryMonitorToolbarHintTooltip === 'function') {
                        window.applyDeliveryMonitorToolbarHintTooltip($x);
                    } else {
                        if ($x.data('bs.tooltip')) {
                            try {
                                $x.tooltip('destroy');
                            } catch (ignore) {
                                /* ignore */
                            }
                        }
                        $x.tooltip({ container: 'body' });
                    }
                });
                $table.find('.dm-tooltip-chave-nfe').tooltip({
                    container: 'body',
                    template: dmChaveNfeTooltipTemplate
                });
            } else if (typeof invTableUi.afterDraw === 'function') {
                invTableUi.afterDraw(table, { $table: $table, mainContainer: mainContainer, $tableWrap: $tableWrap, $wrapper: $wrapper });
            } else {
                $('[data-toggle="tooltip"]').tooltip({ container: 'body' });
            }

            // Lógica de Checkbox Mestre
            const allRowsCount = table.rows().count();
            const $theadLive = $table.find('thead').first();

            if (invTableUi.emptyStateWrapClass) {
                if (allRowsCount === 0) {
                    $tableWrap.addClass(invTableUi.emptyStateWrapClass);
                } else {
                    $tableWrap.removeClass(invTableUi.emptyStateWrapClass);
                }
            }

            let selectedCount = 0;
            try {
                selectedCount = table.rows({ selected: true }).count();
            } catch (ignore) {
                selectedCount = 0;
            }
            var masterChk = resolveMasterCheckboxControls(mainContainer);
            var checkIcon = masterChk.$checkIcon;
            var selectRowsBtn = masterChk.$selectRows;

            checkIcon.removeClass("fa-square-o fa-check-square-o fa-minus-square-o");
            if ($theadLive.length) {
                $theadLive.show();
            }
            $footer.show()
            if (allRowsCount > 0 && selectedCount === allRowsCount) {

                checkIcon.addClass("fa-check-square-o");
                if (selectRowsBtn.length) {
                    invTableUpdateSelectRowsHint(selectRowsBtn, 'Desselecionar todas as linhas', isDeliveryMonitorGrid);
                }
            } else if (selectedCount > 0) {


                checkIcon.addClass("fa-minus-square-o");
                if (selectRowsBtn.length) {
                    invTableUpdateSelectRowsHint(selectRowsBtn, 'Desselecionar todas as linhas', isDeliveryMonitorGrid);
                }
            } else if (allRowsCount == 0) {
                if ($theadLive.length) {
                    $theadLive.hide();
                }
                $footer.hide();
            } else {

                checkIcon.addClass("fa-square-o");
                if (selectRowsBtn.length) {
                    invTableUpdateSelectRowsHint(selectRowsBtn, 'Selecionar todas as linhas', isDeliveryMonitorGrid);
                }
            }

            dataTableAdjustResponsiveSafe($table.DataTable());
         

        })
        // ... (Outros eventos: select.dt, deselect.dt, click, hover, etc.) ...
        .on('select.dt deselect.dt draw.dt', function (e, dt, type, indexes) {
            const tableInstance = $table.DataTable();

            // LÓGICA DO ÍCONE INDIVIDUAL
            if (e.type === 'select' || e.type === 'deselect') {
                tableInstance.rows(indexes).nodes().to$().each(function () {
                    const row = $(this);
                    const icon = row.find('.row-checkbox-icon');

                    if (row.hasClass('selected')) {
                        icon.removeClass('fa-square-o').addClass('fa-check-square-o');
                    } else {
                        icon.removeClass('fa-check-square-o').addClass('fa-square-o');
                    }
                });
            }








            // LÓGICA DE CHECKBOX MESTRE (sempre usar API da tabela; nos eventos select/deselect o 2º parâmetro não é a API)
            const table = $table.DataTable();
            const allRowsCount = table.rows().count();
            let selectedCount = 0;
            try {
                selectedCount = table.rows({ selected: true }).count();
            } catch (ignore) {
                selectedCount = 0;
            }


            // O wrapper geral do DataTables
            const $wrapper = $table.closest('.dataTables_wrapper');


            const $searchFilter = $wrapper.find('.dataTables_filter');
            const $footer = $wrapper.find('.footer-table').first();

            if (selectedCount > 0) {
                // MAIS DE UMA SELECIONADA: Oculta TODAS as ações individuais
                // Isso anula a ação de HOVER que as mostra.
                $table.find('.action-buttons-group').css('display', 'none');

                if (selectedCount == 1) {
                    var texto = `(${selectedCount}) Item selecionado`
                } else {
                    var texto = `(${selectedCount}) Itens selecionados`
                }
                selectedContainer.find('.selected-count').html(texto);

                selectedContainer.show();
                if ($panelFilterRow.length) $panelFilterRow.hide();
                // Opcional: Adiciona uma classe para styling de linha
                $table.find('tr.bg-row-selected').addClass('bulk-editing');

            } else {
                // ZERO ou APENAS UMA SELECIONADA: Permite a exibição via HOVER
                // Não fazemos nada aqui, a ação de hover/CSS fará o trabalho de mostrar/ocultar.
                // Apenas removemos a classe extra (se houver)
                $table.find('tr').removeClass('bulk-editing');
                selectedContainer.find('.selected-count').html('(0) ');
                selectedContainer.hide();
                if ($panelFilterRow.length) $panelFilterRow.show();
            }


            if (allRowsCount === 0) {
                $footer.hide();
            } else {
                // Tabela com dados: Garante que o campo de pesquisa esteja visível

                const tableInner = $table.DataTable();
                let selInner = 0;
                try {
                    selInner = tableInner.rows({ selected: true }).count();
                } catch (ignore) {
                    selInner = 0;
                }
                if (selInner > 0) {


                } else {
                    $searchFilter.show();
                    $footer.show();
                }


            }

            var masterChk2 = resolveMasterCheckboxControls(mainContainer);
            var $mIcon = masterChk2.$checkIcon;
            var $mBtn = masterChk2.$selectRows;
            $mIcon.removeClass("fa-square-o fa-check-square-o fa-minus-square-o");

            if (allRowsCount > 0 && selectedCount === allRowsCount) {
                $mIcon.addClass("fa-check-square-o");
                if ($mBtn.length) {
                    invTableUpdateSelectRowsHint($mBtn, 'Desselecionar todas as linhas', isDeliveryMonitorGrid);
                }
            } else if (selectedCount > 0) {
                $mIcon.addClass("fa-minus-square-o");
                if ($mBtn.length) {
                    invTableUpdateSelectRowsHint($mBtn, 'Desselecionar todas as linhas', isDeliveryMonitorGrid);
                }

            } else {
                $mIcon.addClass("fa-square-o");
                if ($mBtn.length) {
                    invTableUpdateSelectRowsHint($mBtn, 'Selecionar todas as linhas', isDeliveryMonitorGrid);
                }
            }
        })
        .on('error.dt', function (e, settings, techNote, message) {
            if (isDeliveryMonitorGrid) {
                $loading.hide();
                $tableWrap.show();
                $table.closest('.dataTables_wrapper').find('.footer-table').first().show();
            }
            if (typeof invTableUi.onDataTableError === 'function') {
                invTableUi.onDataTableError({ mainContainer: mainContainer, $table: $table, $tableWrap: $tableWrap, $loading: $loading });
            }
            if (typeof console !== 'undefined' && console.error) console.error('DataTables: ', message);
            simpleErrorToast('Ocorreu um erro ao buscar os dados da tabela', 10000);
        });

    // Campo de busca: usa searchSelector (3º arg) se passado, senão fallback #customSearch
    const $searchInput = (searchSelector && searchSelector.length) ? searchSelector : $('#customSearch');
    if ($searchInput.length) {
        if (searchClientSideOnly) {
            // Ref.: https://datatables.net/manual/search#Example
            // Com serverSide: true, search(fn).draw() dispararia nova requisição a cada digitação; por isso
            // aplicamos uma função de busca apenas nas linhas da página atual (mostrar/ocultar), sem draw().
            function rowDataToSearchText(rowData) {
                var rowText = '';
                if (Array.isArray(rowData)) {
                    for (var i = 0; i < rowData.length; i++) rowText += ' ' + (rowData[i] != null ? String(rowData[i]) : '');
                } else if (rowData && typeof rowData === 'object') {
                    for (var k in rowData) if (Object.prototype.hasOwnProperty.call(rowData, k) && rowData[k] != null) rowText += ' ' + String(rowData[k]);
                }
                return rowText;
            }
            // Função de busca no estilo do manual: recebe dados da linha, retorna true se a linha deve aparecer
            function searchFilter(rowData, term) {
                if (!term) return true;
                var text = rowDataToSearchText(rowData).toLowerCase();
                return text.indexOf(term) !== -1;
            }
            function applyClientSearch() {
                var term = ($searchInput.val() || '').trim().toLowerCase();
                dataTable.rows({ page: 'current' }).every(function () {
                    var show = searchFilter(this.data(), term);
                    $(this.node()).toggle(show);
                });
            }
            var searchDebounce;
            $searchInput.off('keyup.change.table change.change.table').on('keyup.change.table change.change.table', function () {
                clearTimeout(searchDebounce);
                searchDebounce = setTimeout(applyClientSearch, 180);
            });
            // Aplicar filtro também após cada desenho (ex.: troca de página, novo carregamento)
            $table.on('draw.dt', function () {
                applyClientSearch();
            });
        } else {
            $searchInput.off('keyup.change.table change.change.table').on('keyup.change.table change.change.table', function () {
                dataTable.search(this.value).draw();
            });
        }
    }

    // ColVis: quando colvisTriggerSelector está definido, inclui 'B' no dom, move .dt-buttons para o trigger
    // e deixa o botão real invisível por cima (clique no ícone abre o dropdown). Ícones fa-ellipsis-v nos itens = padrão das outras telas.
    if (colvisTriggerSelector) {
        const $trigger = $(colvisTriggerSelector);
        const $wrapper = $table.closest('.dataTables_wrapper');
        const $dtButtons = $wrapper.find('.dt-buttons');
        if ($dtButtons.length) {
            $trigger.addClass('colvis-trigger-container').prepend($dtButtons);
            $dtButtons.find('.dt-button').addClass('colvis-dt-button-overlay');
        }
        // Ao fechar clicando no botão, o DataTables não reseta o estado; na 3ª vez não abre. Disparar "click fora" (capture) para fechar com o mesmo fluxo.
        $trigger[0].addEventListener('click', function (e) {
            if ($('.dt-button-collection:visible').length) {
                $(document.body).trigger('click.dtb-collection');
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
        }, true);
        $trigger.off('click.colvis').on('click.colvis', function () {
            if (!$dtButtons.length && dataTable.button) {
                dataTable.button('.buttons-colvis').trigger();
            }
        });
        // Reposicionar o dropdown sempre abaixo do botão, dentro da viewport (mesmo lugar no 1º e 2º clique)
        var colvisDropdownMinTop = 8;
        function positionColvisDropdown() {
            var $col = $('.dt-button-collection:visible').last();
            if (!$col.length || !$trigger.length) return;
            var tr = $trigger[0].getBoundingClientRect();
            var colH = 260;
            var colW = 320;
            var gap = 4;
            var winH = window.innerHeight;
            var winW = window.innerWidth;
            var top = tr.bottom + gap;
            var left = tr.left;
            if (top + colH > winH) { top = tr.top - colH - gap; }
            if (top < colvisDropdownMinTop) { top = colvisDropdownMinTop; }
            if (left + colW > winW) { left = winW - colW - 8; }
            if (left < 8) { left = 8; }
            $col.css({
                position: 'fixed',
                top: top + 'px',
                left: left + 'px',
                marginTop: 0,
                marginLeft: 0,
                marginRight: 0,
                marginBottom: 0,
                zIndex: 9999
            });
        }
        function applyColvisItemsStructure() {
            var $col = $('.dt-button-collection:visible').last();
            if (!$col.length) return;
            var ellipsisHtml = '<i class="fa fa-ellipsis-v" aria-hidden="true"></i><i class="fa fa-ellipsis-v" aria-hidden="true" style="padding-right:5px"></i>';
            $col.find('a.dt-button.buttons-columnVisibility').each(function () {
                var $a = $(this);
                if ($a.find('i.fa-ellipsis-v').length) return;
                $a.prepend(ellipsisHtml);
                var text = $a.contents().filter(function () { return this.nodeType === 3; }).text().trim();
                if (text && !$a.find('span').length) {
                    $a.contents().filter(function () { return this.nodeType === 3; }).wrapAll('<span></span>');
                }
            });
            $col.find('a.dt-button.buttons-colvisRestore').each(function () {
                if (!$(this).find('i.fa-ellipsis-v').length) {
                    $(this).prepend('<i class="fa fa-ellipsis-v" aria-hidden="true"></i><i class="fa fa-ellipsis-v" aria-hidden="true" style="padding-right:5px"></i>');
                }
            });
        }
        $trigger.off('click.colvis-icons').on('click.colvis-icons', function () {
            var applied = false;
            var attempts = 0;
            var maxAttempts = 25;
            var interval = setInterval(function () {
                var $col = $('.dt-button-collection:visible').last();
                if ($col.length) {
                    positionColvisDropdown();
                    if (!applied) {
                        applyColvisItemsStructure();
                        applied = true;
                    }
                }
                attempts++;
                if (attempts >= maxAttempts) clearInterval(interval);
            }, 16);
        });
    }

    return $table;
}

if (typeof window !== 'undefined') {
    window.getDynamicPageLength = getDynamicPageLength;
    window.getInvTableUiDefaults = getInvTableUiDefaults;
}
