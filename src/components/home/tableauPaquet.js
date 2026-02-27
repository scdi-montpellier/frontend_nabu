import { fetchAllPaquets } from '../../API/paquet/paquet.js';
import { fetchAllCorpus } from '../../API/paquet/corpus.js';
import { fetchAllStatus } from '../../API/paquet/status.js';
import { afficherCardPaquetModal } from './cardPaquet.js';
import { afficherCardPaquetAddModal } from '../editPaquet/addPaquet.js';
import { ouvrirModalImportPaquetsCsv } from '../editPaquet/importPaquetsCsvModal.js';
import { createDateFilter } from './filterDate.js';
import { formatStatusLabel, renderStatusBadge, initBootstrapTooltips } from '../status/badgeStatus.js';

let dataTablesLoader = null;
let editPaquetLoader = null;
let statusFilterHook = null;
let todoFilterHook = null;
let renderSequence = 0;

function setTableCount(conteneurId, count) {
    const badge = document.querySelector(`[data-count-for="${conteneurId}"]`);
    if (badge) badge.textContent = String(count);
}

function getStatusId(status) {
    return status?.idstatus ?? status?.idStatus ?? status?.id ?? null;
}

function getStatusLabel(status) {
    const raw = status?.name_status ?? status?.nameStatus ?? status?.name ?? status?.statut ?? null;
    return formatStatusLabel(raw, 'Inconnu');
}

function removeDataTableSearchHooksIfAny() {
    if (!window.$ || !window.$.fn || !window.$.fn.dataTable || !window.$.fn.dataTable.ext || !window.$.fn.dataTable.ext.search) {
        statusFilterHook = null;
        todoFilterHook = null;
        return;
    }
    const searchArr = window.$.fn.dataTable.ext.search;

    if (statusFilterHook) {
        const idx = searchArr.indexOf(statusFilterHook);
        if (idx !== -1) searchArr.splice(idx, 1);
        statusFilterHook = null;
    }
    if (todoFilterHook) {
        const idx = searchArr.indexOf(todoFilterHook);
        if (idx !== -1) searchArr.splice(idx, 1);
        todoFilterHook = null;
    }
}

function isToDoTruthy(value) {
    if (value === true || value === 1) return true;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        return v === '1' || v === 'true' || v === 'oui' || v === 'yes';
    }
    return false;
}

function escapeHtml(value) {
    const str = value === null || value === undefined ? '' : String(value);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeTitleAttr(value) {
    return escapeHtml(value);
}

function ensureJQueryAvailable() {
    if (!window.jQuery && !window.$) {
        throw new Error('jQuery n\'est pas chargé. DataTables nécessite jQuery.');
    }
    if (!window.jQuery && window.$) {
        window.jQuery = window.$;
    }
}

function destroyPaquetDataTableIfAny() {
    const $ = window.jQuery || window.$;
    if (!$ || !$.fn || !$.fn.DataTable) return;

    const selector = '#tableau-paquet';
    try {
        if ($.fn.DataTable.isDataTable(selector)) {
            const instance = $(selector).DataTable();
            instance.clear();
            instance.destroy(true);
        }
    } catch (_) {
        // no-op : on évite de casser le rendu si DataTables est dans un état incohérent.
    }
}

function getEditPaquetOnce() {
    if (!editPaquetLoader) {
        editPaquetLoader = import('../../API/paquet/paquet.js');
    }
    return editPaquetLoader;
}

function loadDataTablesOnce() {
    if (window.jQuery && window.jQuery.fn && window.jQuery.fn.DataTable) {
        return Promise.resolve();
    }
    if (!dataTablesLoader) {
        dataTablesLoader = new Promise((resolve, reject) => {
            try {
                ensureJQueryAvailable();
            } catch (err) {
                reject(err);
                return;
            }

            if (!document.querySelector('link[href*="jquery.dataTables.min.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css';
                document.head.appendChild(link);
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Impossible de charger DataTables depuis le CDN.'));
            document.body.appendChild(script);
        });
    }
    return dataTablesLoader;
}

function getDataTablesFrenchLanguage() {
    return {
        processing: 'Traitement en cours...',
        search: 'Rechercher\u00a0:',
        lengthMenu: 'Afficher _MENU_ entrées',
        info: 'Affichage de _START_ à _END_ sur _TOTAL_ entrées',
        infoEmpty: 'Affichage de 0 à 0 sur 0 entrées',
        infoFiltered: '(filtré à partir de _MAX_ entrées au total)',
        infoPostFix: '',
        loadingRecords: 'Chargement en cours...',
        zeroRecords: 'Aucun élément correspondant trouvé',
        emptyTable: 'Aucune donnée disponible dans le tableau',
        paginate: {
            first: 'Premier',
            previous: 'Précédent',
            next: 'Suivant',
            last: 'Dernier'
        },
        aria: {
            sortAscending: ': activer pour trier la colonne par ordre croissant',
            sortDescending: ': activer pour trier la colonne par ordre décroissant'
        },
        select: {
            rows: {
                _: '%d lignes sélectionnées',
                0: 'Aucune ligne sélectionnée',
                1: '1 ligne sélectionnée'
            }
        },
        buttons: {
            copy: 'Copier',
            copyTitle: 'Copie dans le presse-papiers',
            copySuccess: {
                1: '1 ligne copiée dans le presse-papiers',
                _: '%d lignes copiées dans le presse-papiers'
            },
            colvis: 'Visibilité des colonnes',
            collection: 'Collection',
            print: 'Imprimer',
            csv: 'CSV',
            excel: 'Excel',
            pdf: 'PDF'
        }
    };
}

export async function afficherTableauPaquet(conteneurId = 'tableau-paquet-conteneur', filterCorpusId = null) {
    const currentRender = ++renderSequence;

    let conteneur = document.getElementById(conteneurId);
    if (!conteneur) {
        conteneur = document.createElement('div');
        conteneur.id = conteneurId;
        document.body.appendChild(conteneur);
    }

    const isStale = () => currentRender !== renderSequence;

    // Badge compteur dans le header (page d'accueil)
    setTableCount(conteneurId, '…');

    function setLoading(isLoading) {
        if (isLoading) {
            conteneur.setAttribute('aria-busy', 'true');
            if (!conteneur.querySelector('[data-tableau-loading]')) {
                const loading = document.createElement('div');
                loading.className = 'text-center text-muted small py-3';
                loading.setAttribute('data-tableau-loading', '');
                loading.innerHTML = `
                    <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                    Chargement...
                `;
                conteneur.prepend(loading);
            }
        } else {
            conteneur.removeAttribute('aria-busy');
            conteneur.querySelectorAll('[data-tableau-loading]').forEach((e) => e.remove());
        }
    }

    removeDataTableSearchHooksIfAny();

    // Si un rendu précédent avait déjà initialisé DataTables, on le détruit.
    destroyPaquetDataTableIfAny();

    if (!document.getElementById('tableau-paquet-style')) {
        const style = document.createElement('style');
        style.id = 'tableau-paquet-style';
        style.innerHTML = `
            #tableau-paquet { border-collapse: separate; border-spacing: 0; table-layout: fixed; width: 100%; }
            #tableau-paquet th, #tableau-paquet td { border: none; border-bottom: 1px solid var(--bs-border-color, #343A40); text-align: center !important; vertical-align: middle !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            #tableau-paquet thead th { border-bottom: 2px solid var(--bs-border-color, #343A40); background-color: var(--bs-dark, #212529); color: #fff; }
            #tableau-paquet thead th#todo-filter-th { cursor: pointer; user-select: none; }
            #tableau-paquet td.folderName { max-width: 150px; }
            #tableau-paquet td.commentaire { max-width: 250px; }
            #tableau-paquet td { line-height: 1.5em; }
            #tableau-paquet tbody tr { cursor: pointer; }
            #tableau-paquet tbody tr:hover { background-color: var(--bs-tertiary-bg, #f5f5f5); }
            #tableau-paquet td .toDo-checkbox { cursor: pointer; }

            /* Controls layout */
            #tableau-paquet-search-row .dataTables_filter { width: 100%; }
            #tableau-paquet-search-row .dataTables_filter label { width: 100%; display: flex; justify-content: center; align-items: center; gap: .5rem; margin: 0; }
            #tableau-paquet-search-row .dataTables_filter input { max-width: 380px; }

            #tableau-paquet-controls-row .dataTables_length { margin: 0; }
            #tableau-paquet-controls-row .dataTables_length label { display: flex; align-items: center; gap: .5rem; margin: 0; }
            #tableau-paquet-controls-row .dataTables_length select { width: auto; }

            @media (max-width: 767.98px) {
                #tableau-paquet-controls-row .dataTables_length,
                #tableau-paquet-controls-row .dataTables_length label {
                    width: 100%;
                    justify-content: center;
                }

                #tableau-paquet-controls-row .input-group {
                    width: 100%;
                    min-width: 0 !important;
                }
            }

        `;
        document.head.appendChild(style);
    }

    setLoading(true);

    conteneur.innerHTML = `
    <div id="tableau-paquet-scroll-wrap" style="width:100%;">
        <div id="tableau-paquet-search-row" class="row g-2 mb-2">
            <div class="col-12 d-flex justify-content-center align-items-center gap-2" id="tableau-paquet-filter-col"></div>
        </div>
        <div id="tableau-paquet-controls-row" class="row g-2 align-items-center mb-2 justify-content-md-between">
            <div class="col-12 col-md-auto d-flex justify-content-center justify-content-md-start" id="tableau-paquet-length-col"></div>
            <div class="col-12 col-md-auto d-flex justify-content-center" id="tableau-paquet-date-filter-col"></div>
            <div class="col-12 col-md-auto d-flex justify-content-center justify-content-md-end" id="tableau-paquet-status-filter-col"></div>
        </div>
        <div id="tableau-paquet-scroll">
            <table id="tableau-paquet" class="table table-striped table-hover align-middle" style="width:100%; min-width:700px;">
                <thead>
                    <tr>
                        <th style="background: rgb(33, 37, 41); color: rgb(255, 255, 255); width: 113px; text-align: center; vertical-align: middle;">Dossier</th>
                        <th style="background: rgb(33, 37, 41); color: rgb(255, 255, 255); width: 113px; text-align: center; vertical-align: middle;">Cote</th>
                        <th style="background: rgb(33, 37, 41); color: rgb(255, 255, 255); width: 113px; text-align: center; vertical-align: middle;">Corpus</th>
                        <th style="background: rgb(33, 37, 41); color: rgb(255, 255, 255); width: 113px; text-align: center; vertical-align: middle;">Commentaire</th>
                        <th style="background: rgb(33, 37, 41); color: rgb(255, 255, 255); width: 113px; text-align: center; vertical-align: middle;">SIP</th>
                        <th style="background: rgb(33, 37, 41); color: rgb(255, 255, 255); width: 113px; text-align: center; vertical-align: middle;">Statut</th>
                        <th id="todo-filter-th" role="button" tabindex="0" aria-pressed="false" title="Cliquer pour filtrer : À faire uniquement" style="background: rgb(33, 37, 41); color: rgb(255, 255, 255); width: 113px; text-align: center; vertical-align: middle;">À faire</th>
                        <th class="d-none" style="background: rgb(33, 37, 41); color: rgb(255, 255, 255); width: 113px; text-align: center; vertical-align: middle;">DateTri</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>`;

    const dateFilterCol = conteneur.querySelector('#tableau-paquet-date-filter-col');
    let sortOrder = 'desc';
    if (dateFilterCol) {
        const dateFilter = createDateFilter((order) => {
            sortOrder = order;
            if (window.$ && window.$.fn && window.$.fn.DataTable && $.fn.DataTable.isDataTable('#tableau-paquet')) {
                $('#tableau-paquet').DataTable().order([7, sortOrder]).draw();
            }
        });
        dateFilter.style.marginLeft = '0';
        dateFilter.classList.add('input-group-sm');
        dateFilter.style.minWidth = '220px';
        dateFilterCol.appendChild(dateFilter);
    }

    const scrollDiv = conteneur.querySelector('#tableau-paquet-scroll');
    const mq = window.matchMedia('(max-width: 991.98px)');
    function setTableScroll(e) { scrollDiv.style.overflowX = e.matches ? 'auto' : 'unset'; }
    setTableScroll(mq);
    mq.onchange = setTableScroll;

    let corpusResult;
    let paquetsResult;
    let statusResult;
    try {
        [corpusResult, paquetsResult, statusResult] = await Promise.all([
            fetchAllCorpus(),
            fetchAllPaquets(),
            fetchAllStatus()
        ]);
    } catch (err) {
        setTableCount(conteneurId, 0);
        conteneur.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des données.</div>';
        return;
    }

    if (isStale()) {
        return;
    }
    const corpusList = corpusResult?.data || corpusResult;
    const paquets = paquetsResult?.data || paquetsResult;
    const statusList = statusResult?.data || statusResult;
    if (!paquets || !Array.isArray(paquets) || !corpusList || !Array.isArray(corpusList) || !statusList || !Array.isArray(statusList)) {
        setTableCount(conteneurId, 0);
        conteneur.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des paquets, corpus ou statuts.</div>';
        return;
    }
    const corpusDict = {};
    corpusList.forEach(c => { corpusDict[c.idcorpus || c.idCorpus] = c.name_corpus || c.nameCorpus; });

    const statusById = new Map();
    statusList.forEach(s => {
        const id = getStatusId(s);
        if (id !== null && id !== undefined && id !== '') {
            statusById.set(String(id), s);
        }
    });

    try {
        await loadDataTablesOnce();
    } catch (err) {
        setLoading(false);
        conteneur.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement du composant de tableau.</div>';
        return;
    }

    if (isStale()) {
        return;
    }

    // Cas intermittent typique : plusieurs appels concurrents finissent par arriver ici.
    // On redétruit juste avant l'init pour éviter "Cannot reinitialise DataTable".
    destroyPaquetDataTableIfAny();

    const filteredPaquets = filterCorpusId
        ? paquets.filter(p => String(p.corpusId) === String(filterCorpusId))
        : paquets;

    setTableCount(conteneurId, filteredPaquets.length);

    let selectedStatusId = '';
    let todoOnly = false;

    const $ = window.jQuery || window.$;
    const table = $('#tableau-paquet').DataTable({
        data: filteredPaquets.map(p => ({
            ...p,
            lastmodifDateISO: (p.lastmodifDate || p.date) ? new Date(p.lastmodifDate || p.date).toISOString() : ''
        })),
        initComplete: () => {
            if (!isStale()) {
                setLoading(false);
                initBootstrapTooltips(conteneur);
            }
        },
        columns: [
            { data: 'folderName', className: 'folderName', render: v => {
                const safe = escapeHtml(v || '-');
                const title = safeTitleAttr(v || '');
                return `<span title="${title}">${safe}</span>`;
            } },
            { data: 'cote', render: v => v || '-' },
            { data: 'corpusId', render: v => corpusDict[v] || '-' },
            { data: 'commentaire', className: 'commentaire', render: v => {
                const safe = escapeHtml(v || '-');
                const title = safeTitleAttr(v || '');
                return `<span title="${title}">${safe}</span>`;
            } },
            { data: 'filedSip', render: v => v ? '<span class="badge bg-primary">Oui</span>' : '<span class="badge bg-secondary">Non</span>' },
            { data: 'statusId', render: (v) => {
                const status = statusById.get(String(v)) ?? statusById.get('1') ?? null;
                return renderStatusBadge(status);
            } },
            { data: 'toDo', render: (v) =>
                `<input type="checkbox" class="form-check-input toDo-checkbox" ${v ? 'checked' : ''}>`
            },
            { data: 'lastmodifDateISO', visible: false }
        ],

        columnDefs: [
            { targets: 6, orderable: false }
        ],

        deferRender: true,

        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Tous"]],
        order: [[7, 'desc']],
        info: false,
        language: getDataTablesFrenchLanguage()
    });

    // Filtre par statut (filtrage exact sur l'ID)
    if (window.$ && window.$.fn && window.$.fn.dataTable && window.$.fn.dataTable.ext && window.$.fn.dataTable.ext.search) {
        statusFilterHook = function(settings, data, dataIndex) {
            if (!settings || !settings.nTable || settings.nTable.id !== 'tableau-paquet') return true;
            if (!selectedStatusId) return true;
            const rowData = settings.aoData && settings.aoData[dataIndex] ? settings.aoData[dataIndex]._aData : null;
            const rowStatusId = rowData?.statusId ?? null;
            return String(rowStatusId) === String(selectedStatusId);
        };
        window.$.fn.dataTable.ext.search.push(statusFilterHook);

        // Filtre "À faire" (sur le booléen toDo)
        todoFilterHook = function(settings, data, dataIndex) {
            if (!settings || !settings.nTable || settings.nTable.id !== 'tableau-paquet') return true;
            if (!todoOnly) return true;
            const rowData = settings.aoData && settings.aoData[dataIndex] ? settings.aoData[dataIndex]._aData : null;
            return isToDoTruthy(rowData?.toDo);
        };
        window.$.fn.dataTable.ext.search.push(todoFilterHook);
    }

    // Filtre "À faire" via clic sur l'entête de colonne (sans ajouter de contrôle)
    const todoFilterTh = conteneur.querySelector('#todo-filter-th');
    const syncTodoHeader = () => {
        if (!todoFilterTh) return;
        todoFilterTh.setAttribute('aria-pressed', todoOnly ? 'true' : 'false');
        todoFilterTh.classList.toggle('text-decoration-underline', todoOnly);
        todoFilterTh.title = todoOnly
            ? 'Filtre actif : affiche uniquement les paquets à faire (cliquer pour désactiver)'
            : 'Cliquer pour filtrer : À faire uniquement';
    };
    if (todoFilterTh) {
        // Capture pour éviter le tri DataTables sur ce header.
        todoFilterTh.addEventListener('click', (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            todoOnly = !todoOnly;
            syncTodoHeader();
            table.draw();
        }, true);
        todoFilterTh.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                todoOnly = !todoOnly;
                syncTodoHeader();
                table.draw();
            }
        });
        syncTodoHeader();
    }

    // UI filtre statut
    const statusFilterCol = conteneur.querySelector('#tableau-paquet-status-filter-col');
    if (statusFilterCol) {
        statusFilterCol.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'input-group input-group-sm align-items-center';
        wrapper.style.minWidth = '240px';

        const label = document.createElement('label');
        label.className = 'input-group-text px-2';
        label.htmlFor = 'status-filter-select';
        label.textContent = 'Statut';

        const select = document.createElement('select');
        select.className = 'form-select form-select-sm';
        select.id = 'status-filter-select';
        select.setAttribute('aria-label', 'Filtrer par statut');
        select.style.width = '120px';
        
        select.style.textAlign = 'center';
        select.style.textAlignLast = 'center';

        const optAll = document.createElement('option');
        optAll.value = '';
        optAll.textContent = 'Tous';
        optAll.style.textAlign = 'center';
        select.appendChild(optAll);

        const sortedStatuses = [...statusList]
            .map(s => ({ id: getStatusId(s), label: getStatusLabel(s) }))
            .filter(s => s.id !== null && s.id !== undefined && String(s.id).length)
            .sort((a, b) => String(a.label).localeCompare(String(b.label), 'fr'));

        for (const s of sortedStatuses) {
            const opt = document.createElement('option');
            opt.value = String(s.id);
            opt.textContent = s.label;
            opt.style.textAlign = 'center';
            select.appendChild(opt);
        }

        select.addEventListener('change', () => {
            selectedStatusId = select.value;
            table.draw();
        });

        wrapper.appendChild(label);
        wrapper.appendChild(select);
        statusFilterCol.appendChild(wrapper);
    }

    table.on('draw.dt', function() {
        const info = table.page.info();
        const nbTotal = info.recordsDisplay;
        const span = document.getElementById('nb-paquet-affiche');
        if (span) {
            span.textContent = nbTotal;
        }

        // Maintient le badge du header synchro avec les filtres/recherches DataTables.
        setTableCount(conteneurId, nbTotal);

		// DataTables reconstruit le DOM : on réactive les tooltips à chaque redraw.
		initBootstrapTooltips(conteneur);
    });

    let filterMoved = false;
    function addPaquetAndCustomPagination() {
        const lengthCol = conteneur.querySelector('#tableau-paquet-length-col');
        const filterCol = conteneur.querySelector('#tableau-paquet-filter-col');
        const dataTablesLength = conteneur.querySelector('.dataTables_length');
        const dataTablesFilter = conteneur.querySelector('.dataTables_filter');
        const dataTablesPaginate = conteneur.querySelector('.dataTables_paginate');
        if (lengthCol && dataTablesLength) {
            lengthCol.innerHTML = '';
            lengthCol.appendChild(dataTablesLength);
        }
        if (filterCol && dataTablesFilter && !filterMoved) {
            filterCol.innerHTML = '';
            filterCol.appendChild(dataTablesFilter);
            dataTablesFilter.style.width = '100%';
            dataTablesFilter.style.maxWidth = '520px';
            dataTablesFilter.style.display = 'flex';
            dataTablesFilter.style.justifyContent = 'center';
            dataTablesFilter.style.margin = '0 auto';
            if (!document.getElementById('btn-importer-paquets')) {
                const btnImport = document.createElement('button');
                btnImport.id = 'btn-importer-paquets';
                btnImport.className = 'btn btn-outline-primary ms-2';
                btnImport.innerHTML = '<i class="bi bi-upload"></i> Importer';
                btnImport.addEventListener('click', (e) => {
                    e.preventDefault();
                    ouvrirModalImportPaquetsCsv();
                });
                filterCol.appendChild(btnImport);
            }
            if (!document.getElementById('btn-ajouter-paquet')) {
                const btn = document.createElement('button');
                btn.id = 'btn-ajouter-paquet';
                btn.className = 'btn btn-primary ms-2';
                btn.innerHTML = '<i class="bi bi-plus"></i> Ajouter';
                btn.addEventListener('click', (e) => { e.preventDefault(); afficherCardPaquetAddModal(); });
                filterCol.appendChild(btn);
            }
            filterMoved = true;
        }
        if (dataTablesPaginate) {
            const info = table.page.info();
            if (info.pages > 1) {
                dataTablesPaginate.innerHTML = '';

                const wrap = document.createElement('div');
                wrap.className = 'd-flex justify-content-end align-items-center gap-2 flex-wrap';

                const prevBtn = document.createElement('button');
                prevBtn.type = 'button';
                prevBtn.className = 'btn btn-outline-secondary btn-sm';
                prevBtn.innerHTML = 'Préc.';
                prevBtn.title = 'Page précédente';
                prevBtn.disabled = info.page <= 0;
                prevBtn.addEventListener('click', () => {
                    const pageNum = table.page();
                    if (pageNum > 0) table.page(pageNum - 1).draw('page');
                });

                const nextBtn = document.createElement('button');
                nextBtn.type = 'button';
                nextBtn.className = 'btn btn-outline-secondary btn-sm';
                nextBtn.innerHTML = 'Suiv.';
                nextBtn.title = 'Page suivante';
                nextBtn.disabled = info.page >= info.pages - 1;
                nextBtn.addEventListener('click', () => {
                    const pageNum = table.page();
                    if (pageNum < table.page.info().pages - 1) table.page(pageNum + 1).draw('page');
                });

                const inputGroup = document.createElement('div');
                inputGroup.className = 'input-group input-group-sm';
                inputGroup.style.width = '180px';

                const labelSpan = document.createElement('span');
                labelSpan.className = 'input-group-text';
                labelSpan.textContent = 'Page';

                const pageInput = document.createElement('input');
                pageInput.type = 'number';
                pageInput.className = 'form-control';
                pageInput.min = 1;
                pageInput.max = info.pages;
                pageInput.value = info.page + 1;
                pageInput.setAttribute('aria-label', 'Numéro de page');

                const totalSpan = document.createElement('span');
                totalSpan.className = 'input-group-text';
                totalSpan.textContent = `/ ${info.pages}`;

                const goToPage = () => {
                    let pageNum = parseInt(pageInput.value, 10);
                    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
                    if (pageNum > table.page.info().pages) pageNum = table.page.info().pages;
                    table.page(pageNum - 1).draw('page');
                };
                pageInput.addEventListener('change', goToPage);
                pageInput.addEventListener('keydown', (evt) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        goToPage();
                    }
                });

                inputGroup.appendChild(labelSpan);
                inputGroup.appendChild(pageInput);
                inputGroup.appendChild(totalSpan);

                wrap.appendChild(prevBtn);
                wrap.appendChild(inputGroup);
                wrap.appendChild(nextBtn);
                dataTablesPaginate.appendChild(wrap);
            } else {
                dataTablesPaginate.innerHTML = '';
            }
        }
    }
    setTimeout(addPaquetAndCustomPagination, 100);
    table.on('draw.dt', function() { setTimeout(addPaquetAndCustomPagination, 0); });

    $('#tableau-paquet tbody').on('click', 'tr', function(e) {
        if (e.target.classList && e.target.classList.contains('toDo-checkbox')) return;
        const data = table.row(this).data();
        afficherCardPaquetModal(data);
    });
    $('#tableau-paquet tbody').on('change', '.toDo-checkbox', async function() {
        const rowEl = $(this).closest('tr');
        const paquet = table.row(rowEl).data();
        if (!paquet) return;
        paquet.toDo = this.checked;
        try {
            const { editPaquet } = await getEditPaquetOnce();
            await editPaquet({ ...paquet, toDo: this.checked });
            if (window.afficherTableauToDoPaquet) {
                window.afficherTableauToDoPaquet('to-do-paquet-conteneur');
            }
            // Si le filtre "À faire" est actif, le changement doit refléter immédiatement le tableau.
            table.draw(false);
        } catch (err) {
            alert('Erreur lors de la modification du toDo');
        }
    });
}

window.afficherTableauPaquet = afficherTableauPaquet;
