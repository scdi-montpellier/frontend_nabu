import { fetchAllCorpus } from '../../API/paquet/corpus.js';
import { showEditCorpusModal } from './editCorpusModal.js';
import { showCreateCorpusModal } from './createCorpusModal.js';

let selectedCorpus = null;

let corpusSelectInstanceCounter = 0;

let corpusEditCaptureHandlerInstalled = false;

function installCorpusEditCaptureHandler() {
	if (corpusEditCaptureHandlerInstalled) return;
	corpusEditCaptureHandlerInstalled = true;

	document.addEventListener('mousedown', (e) => {
		const target = e.target;
		if (!(target instanceof Element)) return;

		const iconEl = target.closest('.corpus-edit-icon');
		if (!iconEl) return;

		const optionRoot = iconEl.closest('.corpus-option');
		const id = optionRoot?.getAttribute?.('data-corpus-id');
		if (!id || id === 'ALL') return;

		// Empêche Select2 de traiter ce clic comme une sélection d'option
		e.preventDefault();
		e.stopPropagation();

		const nom = optionRoot?.getAttribute?.('data-corpus-nom') || '';
		const description = optionRoot?.getAttribute?.('data-corpus-description') || '';

		// Retrouve le <select> lié via l'id du <ul> results (select2-<selectId>-results)
		let selectEl = null;
		const resultsList = iconEl.closest('.select2-results__options');
		const resultsId = resultsList?.getAttribute?.('id') || '';
		const prefix = 'select2-';
		const suffix = '-results';
		if (resultsId.startsWith(prefix) && resultsId.endsWith(suffix)) {
			const selectId = resultsId.slice(prefix.length, resultsId.length - suffix.length);
			selectEl = document.getElementById(selectId);
		}

		if (selectEl) {
			try {
				window.$(selectEl).select2('close');
			} catch (_) {
			}
		}

		showEditCorpusModal(
			{ id: String(id), nom, description },
			(updated) => {
				if (!selectEl) return;
				const opt = Array.from(selectEl.options).find(o => String(o.value) === String(id));
				if (opt) {
					opt.textContent = updated?.nameCorpus ?? opt.textContent;
					opt.dataset.corpus = JSON.stringify({
						id: String(id),
						nom: updated?.nameCorpus ?? nom,
						description: updated?.descriptionCorpus ?? description
					});
				}
				try {
					window.$(selectEl).trigger('change');
				} catch (_) {
				}
			}
		);
	}, true);
}


export function selectCorpus(onSelect, defaultValue, options = {}) {
	const container = document.createElement('div');
	container.className = 'd-flex align-items-center gap-2';
	const select = document.createElement('select');
	select.className = 'select-small corpus-select';
	const instanceId = options?.id || `corpus-select-${++corpusSelectInstanceCounter}`;
	select.id = instanceId;
	select.style.flex = '1 1 auto';

	const addButton = document.createElement('button');
	addButton.type = 'button';
	addButton.className = 'btn btn-primary btn-sm flex-shrink-0 d-inline-flex align-items-center justify-content-center';
	addButton.innerHTML = `
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
			<path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/>
		</svg>
		<span class="visually-hidden">Ajouter un corpus</span>
	`;
	addButton.setAttribute('aria-label', 'Ajouter un corpus');
	addButton.title = 'Ajouter un corpus';

	const hasSelect2 = () => !!(window.$ && window.$.fn && window.$.fn.select2);
	const tryDestroySelect2 = () => {
		if (!hasSelect2()) return;
		try {
			const $el = window.$(select);
			if ($el && $el.data && $el.data('select2')) {
				$el.select2('destroy');
			}
		} catch (_) {
		}
	};

	const ensureInstanceStyle = () => {
		const existing = container.querySelector(`style[data-corpus-select-style="${instanceId}"]`);
		if (existing) return;
		const style = document.createElement('style');
		style.setAttribute('data-corpus-select-style', instanceId);
		style.innerHTML = `
			#${instanceId} + .select2 {
				flex: 1 1 auto;
				min-width: 0;
			}
			#${instanceId} + .select2 .select2-selection__rendered {
				text-align: center !important;
				width: 100%;
				font-weight: bold;
			}
			.select2-results__option[role="option"][id^="select2-${instanceId}-result"][id$="-ALL"] {
				text-align: center !important;
			}
		`;
		container.appendChild(style);
	};

	const setSelectionValue = (value) => {
		if (value === undefined || value === null || value === '') return;
		select.value = String(value);
		if (hasSelect2()) {
			try {
				window.$(select).val(String(value)).trigger('change');
				return;
			} catch (_) {
			}
		}
		select.dispatchEvent(new Event('change'));
	};

	const initSelect2IfNeeded = (attempt = 0) => {
		if (!hasSelect2()) return;
		if (!container.isConnected) {
			if (attempt >= 20) return;
			setTimeout(() => initSelect2IfNeeded(attempt + 1), 0);
			return;
		}
		tryDestroySelect2();
		try {
			window.$(select).select2({
				width: 'resolve',
				templateResult: formatCorpusOption,
				templateSelection: formatCorpusSelection,
				dropdownParent: window.$(container),
				escapeMarkup: function (markup) { return markup; }
			});
			installCorpusEditCaptureHandler();
			ensureInstanceStyle();
		} catch (_) {
		}
	};

	const reloadCorpusOptions = async (selectionToApply) => {
		const currentValue = select.value;
		tryDestroySelect2();
		select.innerHTML = '';

		const corpusList = await fetchAllCorpus();
		if (corpusList && corpusList.success && Array.isArray(corpusList.data)) {
			const allOption = document.createElement('option');
			allOption.value = 'ALL';
			allOption.textContent = 'TOUS';
			allOption.dataset.corpus = JSON.stringify({
				id: 'ALL',
				nom: 'TOUS',
				description: 'Afficher tous les paquets'
			});
			allOption.selected = true;
			select.appendChild(allOption);

			const sortedCorpus = corpusList.data.slice().sort((a, b) => {
				const nameA = (a.name_corpus || '').toLowerCase();
				const nameB = (b.name_corpus || '').toLowerCase();
				if (nameA < nameB) return -1;
				if (nameA > nameB) return 1;
				return 0;
			});

			sortedCorpus.forEach(corpus => {
				const option = document.createElement('option');
				option.value = corpus.idcorpus;
				option.textContent = corpus.name_corpus;
				option.dataset.corpus = JSON.stringify({
					id: corpus.idcorpus,
					nom: corpus.name_corpus,
					description: corpus.desciption_corpus
				});
				select.appendChild(option);
			});

			setTimeout(() => {
				initSelect2IfNeeded(0);
				const valueToApply = selectionToApply ?? defaultValue ?? (currentValue || 'ALL');
				setSelectionValue(valueToApply);
			}, 0);
		}
	};

	// Charge initialement la liste des corpus
	reloadCorpusOptions(defaultValue);

	const handleSelectionChange = () => {
		const selectedOption = select.options[select.selectedIndex];
		if (selectedOption && selectedOption.value === 'ALL') {
			selectedCorpus = 'ALL';
			if (typeof onSelect === 'function') {
				onSelect('ALL');
			}
		} else if (selectedOption && selectedOption.dataset.corpus) {
			selectedCorpus = JSON.parse(selectedOption.dataset.corpus);
			if (typeof onSelect === 'function') {
				onSelect(selectedCorpus);
			}
		} else {
			selectedCorpus = null;
			if (typeof onSelect === 'function') {
				onSelect(null);
			}
		}
	};

	select.addEventListener('change', handleSelectionChange);
	setTimeout(() => {
		if (hasSelect2()) {
			window.$(select).on('change.selectCorpus', (e) => {
				if (e && e.originalEvent) return;
				handleSelectionChange();
			});
		}
	}, 0);

	addButton.addEventListener('click', () => {
		showCreateCorpusModal((res) => {
			reloadCorpusOptions();
		});
	});

	container.appendChild(select);
	container.appendChild(addButton);
	return container;
}

function formatCorpusOption(state) {
	if (!state.id) return state.text;
	const option = state.element;
	if (option && option.dataset && option.dataset.corpus) {
		const corpus = JSON.parse(option.dataset.corpus);
		const showPencil = corpus && corpus.id && corpus.id !== 'ALL';
		const pencilSvg = `
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
				<path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
				<path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
			</svg>
		`;

		let html = `<div class='corpus-option position-relative text-center' data-corpus-id='${escapeAttr(corpus.id)}' data-corpus-nom='${escapeAttr(corpus.nom ?? '')}' data-corpus-description='${escapeAttr(corpus.description ?? '')}'>`;
		html += `<div class='corpus-nom'><b>${corpus.nom}</b></div>`;
		if (corpus.description) {
			html += `<div class='corpus-desc' style='color: #6C757D;'>${corpus.description}</div>`;
		}
		if (showPencil) {
			html += `<span class='corpus-edit-icon position-absolute top-50 end-0 translate-middle-y me-2 text-white' role='button' aria-label='Modifier le corpus'>${pencilSvg}</span>`;
		}
		html += `</div>`;
		return window.$('<span>').html(html);
	}
	return state.text;
}

function escapeAttr(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function formatCorpusSelection(state) {
	if (!state.id) return state.text;
	const option = state.element;
	if (option && option.dataset && option.dataset.corpus) {
		const corpus = JSON.parse(option.dataset.corpus);
		return `<span style='display: inline-block; width: 100%; text-align: center;'><b>${corpus.nom}</b></span>`;
	}
	return state.text;
}

export function getSelectedCorpus() {
	return selectedCorpus;
}
