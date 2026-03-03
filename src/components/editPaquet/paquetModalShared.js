export function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function normalizeStatusLabel(label) {
	const raw = String(label || '')
		.trim()
		.toUpperCase();
	const noDiacritics = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	return noDiacritics
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

export function getStatusValueByNormalizedLabel(statusSelectEl, normalizedLabel) {
	if (!statusSelectEl) return '';
	const target = String(normalizedLabel || '').trim().toUpperCase();
	if (!target) return '';
	const options = Array.from(statusSelectEl.options || []);
	const match = options.find(o => (o?.dataset?.normalizedLabel || normalizeStatusLabel(o.textContent)) === target);
	return match ? match.value : '';
}

export function applySipRule(formEl) {
	const sipCheckbox = formEl?.querySelector('[name="filedSip"]');
	const statusSelectEl = formEl?.querySelector('#status-select-container select');
	if (!sipCheckbox || !statusSelectEl) return;

	const nonEnvoyeValue = getStatusValueByNormalizedLabel(statusSelectEl, 'NON_ENVOYE');
	if (!nonEnvoyeValue) return;

	if (sipCheckbox.checked) {
		if (!statusSelectEl.dataset.prevValue) {
			statusSelectEl.dataset.prevValue = statusSelectEl.value || '';
		}
		statusSelectEl.value = nonEnvoyeValue;
		statusSelectEl.disabled = true;
	} else {
		statusSelectEl.disabled = false;
		if (statusSelectEl.dataset.prevValue !== undefined) {
			statusSelectEl.value = statusSelectEl.dataset.prevValue;
			delete statusSelectEl.dataset.prevValue;
		}
	}
}

export function showPopup(message, success = true, { zIndex = 3000 } = {}) {
	const popup = document.createElement('div');
	popup.className = `alert ${success ? 'alert-success' : 'alert-danger'} position-fixed top-0 start-50 translate-middle-x mt-3 shadow`;
	popup.style.zIndex = String(zIndex);
	popup.style.minWidth = '300px';
	popup.style.maxWidth = '90vw';
	popup.textContent = message;
	document.body.appendChild(popup);
	setTimeout(() => popup.remove(), 2500);
}

export function destroyDataTableIfNeeded(tableSelector) {
	try {
		if (!(window.$ && window.$.fn && window.$.fn.DataTable)) return;
		const $table = window.$(tableSelector);
		if ($table.length && $table.hasClass('dataTable')) {
			$table.DataTable().destroy();
		}
	} catch (e) {
	}
}

function getCurrentCorpusFilterId() {
	// Sur la page d'accueil, le filtre corpus est un <select class="corpus-select">.
	// On privilégie la valeur DOM (compatible Select2).
	const selectEl = document.querySelector('main .corpus-select, .corpus-select');
	const raw = selectEl ? String(selectEl.value || '') : '';
	if (!raw || raw === 'ALL') return null;
	return raw;
}

function capturePaquetTableState() {
	try {
		const $ = window.jQuery || window.$;
		if (!$ || !$.fn || !$.fn.DataTable) return null;
		if (!$.fn.DataTable.isDataTable || !$.fn.DataTable.isDataTable('#tableau-paquet')) return null;
		const dt = $('#tableau-paquet').DataTable();

		const statusSelect = document.getElementById('status-filter-select');
		const dateSelect = document.getElementById('date-sort-select');
		const todoTh = document.getElementById('todo-filter-th');

		return {
			search: typeof dt.search === 'function' ? dt.search() : '',
			order: typeof dt.order === 'function' ? dt.order() : null,
			pageLength: dt.page && typeof dt.page.len === 'function' ? dt.page.len() : null,
			page: dt.page && typeof dt.page === 'function' ? dt.page() : null,
			selectedStatusId: statusSelect ? String(statusSelect.value || '') : '',
			dateSortOrder: dateSelect ? String(dateSelect.value || 'desc') : 'desc',
			todoOnly: todoTh ? todoTh.getAttribute('aria-pressed') === 'true' : false,
		};
	} catch (e) {
		return null;
	}
}

export async function refreshPaquetTables() {
	try {
		const filterCorpusId = getCurrentCorpusFilterId();
		const tableState = capturePaquetTableState();
		destroyDataTableIfNeeded('#tableau-paquet');
		if (window.afficherTableauPaquet) {
			window.afficherTableauPaquet('tableau-paquet-conteneur', filterCorpusId, { state: tableState });
		} else {
			const module = await import('../home/tableauPaquet.js');
			if (module && typeof module.afficherTableauPaquet === 'function') {
				module.afficherTableauPaquet('tableau-paquet-conteneur', filterCorpusId, { state: tableState });
			} else if (window.reloadTableauPaquet) {
				window.reloadTableauPaquet();
			}
		}
	} catch (e) {
	}

	try {
		let toDoFn = window.afficherTableauToDoPaquet;
		if (!toDoFn) {
			const toDoModule = await import('../home/toDo.js');
			toDoFn = toDoModule.afficherTableauToDoPaquet;
		}
		if (typeof toDoFn === 'function') {
			toDoFn('to-do-paquet-conteneur');
		}
	} catch (e) {
	}

	try {
		let sendErrorFn = window.afficherSendErrorPaquet;
		if (!sendErrorFn) {
			const sendErrorModule = await import('../home/sendError.js');
			sendErrorFn = sendErrorModule.afficherSendErrorPaquet;
		}
		if (typeof sendErrorFn === 'function') {
			sendErrorFn('send-error-paquet-conteneur');
		}
	} catch (e) {
	}
}

function lockBodyScroll() {
	const previousOverflow = document.body.style.overflow;
	document.body.style.overflow = 'hidden';
	document.body.classList.add('modal-open');
	return () => {
		document.body.style.overflow = previousOverflow;
		document.body.classList.remove('modal-open');
	};
}

export function openPaquetModal({
	titleText,
	values = {},
	onSubmit,
	afterMount,
} = {}) {
	const oldModal = document.getElementById('paquet-modal-overlay');
	if (oldModal) oldModal.remove();

	const overlay = document.createElement('div');
	overlay.id = 'paquet-modal-overlay';
	overlay.className = 'paquet-modal-overlay modal fade show';
	overlay.style.display = 'block';
	overlay.tabIndex = -1;

	const modal = document.createElement('div');
	modal.className = 'modal-dialog modal-dialog-centered paquet-modal-dialog';
	modal.setAttribute('role', 'dialog');
	modal.setAttribute('aria-modal', 'true');

	const modalContent = document.createElement('div');
	modalContent.className = 'modal-content shadow-lg paquet-modal-content';

	const modalHeader = document.createElement('div');
	modalHeader.className = 'modal-header paquet-modal-header';
	const title = document.createElement('h5');
	const titleId = `paquet-modal-title-${Date.now()}`;
	title.id = titleId;
	title.className = 'modal-title fw-bold text-center w-100';
	title.textContent = titleText || 'Paquet';
	modal.setAttribute('aria-labelledby', titleId);
	const closeBtn = document.createElement('button');
	closeBtn.type = 'button';
	closeBtn.className = 'btn-close';
	closeBtn.setAttribute('aria-label', 'Fermer');

	const form = document.createElement('form');
	form.className = 'modal-body paquet-modal-body';

	const connectedUserId = localStorage.getItem('userId') || '';
	const lastmodifDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

	const safe = {
		folderName: escapeHtml(values.folderName),
		microFilmImage: escapeHtml(values.microFilmImage),
		cote: escapeHtml(values.cote),
		oldCote: escapeHtml(values.oldCote),
		imageColor: escapeHtml(values.imageColor),
		searchArchiving: escapeHtml(values.searchArchiving),
		comment: escapeHtml(values.comment),
		toDoChecked: values.toDo ? 'checked' : '',
		facileTestChecked: values.facileTest ? 'checked' : '',
		filedSipChecked: values.filedSip ? 'checked' : '',
	};

	form.innerHTML = `
		<div class="container-fluid">
			<div class="row g-3">
				<div class="col-md-6">
					<label class="form-label">Nom dossier <span class="text-danger">*</span> :</label>
					<input type="text" class="form-control" name="folderName" required value="${safe.folderName}">
				</div>
				<div class="col-md-6">
					<label class="form-label">Répertoire des images autre :</label>
					<input type="text" class="form-control" name="microFilmImage" value="${safe.microFilmImage}">
				</div>
				<div class="col-md-6">
					<label class="form-label">Cote <span class="text-danger">*</span> :</label>
					<input type="text" class="form-control" name="cote" required value="${safe.cote}">
					${values.includeOldCote ? `<input type="hidden" name="oldCote" value="${safe.oldCote || safe.cote}">` : ''}
				</div>
				<div class="col-md-6">
					<label class="form-label">Répertoire des images couleurs :</label>
					<input type="text" class="form-control" name="imageColor" value="${safe.imageColor}">
				</div>
				<div class="col-md-6">
					<label class="form-label">Corpus :</label>
					<div id="corpus-select-container"></div>
				</div>
				<div class="col-md-6">
					<label class="form-label">Type de document :</label>
					<div id="type-document-select-container"></div>
				</div>
				<div class="col-md-6">
					<label class="form-label">Statut :</label>
					<div id="status-select-container"></div>
				</div>
				<div class="col-md-6">
					<label class="form-label">Recherche Archivage :</label>
					<input type="text" class="form-control" name="searchArchiving" value="${safe.searchArchiving}">
				</div>
				<div class="col-md-12 paquet-modal-flags d-flex align-items-center gap-4 mt-2 mb-2 justify-content-center flex-wrap">
					<div class="form-check">
						<input class="form-check-input" type="checkbox" name="toDo" id="paquetToDo" ${safe.toDoChecked}>
						<label class="form-check-label" for="paquetToDo">A faire :</label>
					</div>
					<div class="form-check">
						<input class="form-check-input" type="checkbox" name="facileTest" id="paquetFacileTest" ${safe.facileTestChecked}>
						<label class="form-check-label" for="paquetFacileTest">Multi volume :</label>
					</div>
					<div class="form-check">
						<input class="form-check-input" type="checkbox" name="filedSip" id="paquetFiledSip" ${safe.filedSipChecked}>
						<label class="form-check-label" for="paquetFiledSip">Déposé dans SIP en prod num :</label>
					</div>
				</div>
				<div class="col-md-12">
					<label class="form-label">Commentaire :</label>
					<textarea class="form-control" name="comment" rows="4">${safe.comment}</textarea>
				</div>
			</div>
			<div class="d-flex justify-content-center mt-4 paquet-modal-actions">
				<button type="submit" class="btn btn-primary px-5">Enregistrer</button>
			</div>
		</div>
		<input type="hidden" name="usersId" value="${escapeHtml(connectedUserId)}">
		<input type="hidden" name="lastmodifDate" value="${escapeHtml(lastmodifDate)}">
	`;

	modalHeader.appendChild(title);
	modalHeader.appendChild(closeBtn);
	modalContent.appendChild(modalHeader);
	modalContent.appendChild(form);
	modal.appendChild(modalContent);
	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	const unlockScroll = lockBodyScroll();

	const destroy = () => {
		try {
			overlay.remove();
		} finally {
			unlockScroll();
			document.removeEventListener('keydown', onKeyDown);
		}
	};

	const onKeyDown = (e) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			destroy();
		}
	};

	document.addEventListener('keydown', onKeyDown);
	closeBtn.addEventListener('click', destroy);
	overlay.addEventListener('click', e => {
		if (e.target === overlay) destroy();
	});

	// Focus
	setTimeout(() => {
		const first = form.querySelector('input[name="folderName"]');
		if (first) first.focus();
	}, 0);

	const collectData = () => {
		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries());

		data.folderName = String(data.folderName || '').trim();
		data.cote = String(data.cote || '').trim();
		if (typeof data.oldCote === 'string') data.oldCote = data.oldCote.trim();
		if (typeof data.microFilmImage === 'string') data.microFilmImage = data.microFilmImage.trim();
		if (typeof data.imageColor === 'string') data.imageColor = data.imageColor.trim();
		if (typeof data.searchArchiving === 'string') data.searchArchiving = data.searchArchiving.trim();
		if (typeof data.comment === 'string') data.comment = data.comment.trim();

		data.toDo = !!form.querySelector('[name="toDo"]').checked;
		data.facileTest = !!form.querySelector('[name="facileTest"]').checked;
		data.filedSip = !!form.querySelector('[name="filedSip"]').checked;

		const selectCorpusEl = form.querySelector('#corpus-select-container select');
		if (selectCorpusEl && selectCorpusEl.value && selectCorpusEl.value !== 'ALL') {
			data.corpusId = selectCorpusEl.value;
		} else {
			delete data.corpusId;
		}

		const selectTypeDocEl = form.querySelector('#type-document-select-container select');
		if (selectTypeDocEl && selectTypeDocEl.value) {
			data.typeDocumentId = selectTypeDocEl.value;
		} else {
			data.typeDocumentId = null;
		}

		const selectStatusEl = form.querySelector('#status-select-container select');
		if (data.filedSip) {
			const nonEnvoyeValue = getStatusValueByNormalizedLabel(selectStatusEl, 'NON_ENVOYE');
			if (!nonEnvoyeValue) {
				throw new Error('STATUT_NON_ENVOYE_INTROUVABLE');
			}
			data.statusId = nonEnvoyeValue;
		} else if (selectStatusEl && selectStatusEl.value) {
			data.statusId = selectStatusEl.value;
		} else {
			delete data.statusId;
		}

		return data;
	};

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (typeof onSubmit !== 'function') return;

		let data;
		try {
			data = collectData();
		} catch (err) {
			if (err && err.message === 'STATUT_NON_ENVOYE_INTROUVABLE') {
				showPopup('Impossible de trouver le statut NON_ENVOYE. Veuillez contacter un administrateur.', false);
				return;
			}
			showPopup("Erreur lors de la validation du formulaire.", false);
			return;
		}

		if (!data.folderName || !data.cote) {
			showPopup('Veuillez remplir tous les champs obligatoires (Nom dossier et Cote).', false);
			return;
		}

		await onSubmit(data, { form, destroy, showPopup });
	});

	(async () => {
		if (typeof afterMount === 'function') {
			try {
				await afterMount({ form, overlay, destroy });
			} catch (e) {
				
			}
		}
	})();

	return { overlay, form, destroy };
}
