function setMiniTableCount(conteneurId, count) {
	const badge = document.querySelector(`[data-count-for="${conteneurId}"]`);
	if (badge) badge.textContent = String(count);
}

function ensureContainer(conteneurId) {
	let conteneur = document.getElementById(conteneurId);
	if (!conteneur) {
		conteneur = document.createElement('div');
		conteneur.id = conteneurId;
		document.body.appendChild(conteneur);
	}
	return conteneur;
}

function getSortTimestamp(paquet) {
	const raw = paquet?.lastmodifDate || paquet?.date || null;
	if (!raw) return 0;
	const parsed = new Date(raw);
	const time = parsed.getTime();
	return Number.isNaN(time) ? 0 : time;
}

function normalizePaquetsResult(paquetsResult) {
	const paquets = paquetsResult && paquetsResult.data ? paquetsResult.data : paquetsResult;
	return Array.isArray(paquets) ? paquets : null;
}

function showLoading(conteneur, conteneurId) {
	setMiniTableCount(conteneurId, '…');
	conteneur.setAttribute('aria-busy', 'true');
	conteneur.innerHTML = `
		<div class="text-center text-muted small" data-mini-table-loading>
			<div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
			Chargement...
		</div>
	`;
}

function showError(conteneur, conteneurId) {
	setMiniTableCount(conteneurId, 0);
	conteneur.removeAttribute('aria-busy');
	conteneur.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des paquets.</div>';
}

export function isFlagTruthy(value) {
	if (value === true) return true;
	if (value === false || value === 0 || value === null || value === undefined) return false;
	if (typeof value === 'number') return value !== 0;
	const v = String(value).trim().toLowerCase();
	if (!v) return false;
	const asNumber = Number(v);
	if (!Number.isNaN(asNumber)) return asNumber !== 0;
	return v === 'true' || v === 'oui' || v === 'yes';
}

export function getPaquetStatusId(paquet) {
	if (!paquet) return null;
	const status = paquet.status ?? null;
	return (
		paquet.statusId ??
		paquet.idStatus ??
		paquet.idstatus ??
		status?.idstatus ??
		status?.idStatus ??
		status?.id ??
		null
	);
}

function buildPageModel(page, pagesTotal) {
	if (pagesTotal <= 7) {
		return Array.from({ length: pagesTotal }, (_, i) => i + 1);
	}
	const model = [1];
	const start = Math.max(2, page - 1);
	const end = Math.min(pagesTotal - 1, page + 1);
	if (start > 2) model.push('...');
	for (let p = start; p <= end; p++) model.push(p);
	if (end < pagesTotal - 1) model.push('...');
	model.push(pagesTotal);
	return model;
}

export async function renderMiniPaquetList(conteneurId, options) {
	const {
		renderKey,
		fetchPaquets,
		filtre,
		htmlVide = '<div class="text-muted text-center">Aucun paquet.</div>',
		classeCarte = 'card shadow-sm w-100 px-3 py-2 text-start',
		renderItem,
		ouvrirPaquet,
		parPage = 4
	} = options || {};

	if (!renderKey) {
		console.error('renderMiniPaquetList: option "renderKey" manquante.');
		return;
	}
	if (typeof fetchPaquets !== 'function') {
		console.error('renderMiniPaquetList: option "fetchPaquets" doit être une fonction.');
		return;
	}
	if (typeof filtre !== 'function') {
		console.error('renderMiniPaquetList: option "filtre" doit être une fonction.');
		return;
	}
	if (typeof ouvrirPaquet !== 'function') {
		console.error('renderMiniPaquetList: option "ouvrirPaquet" doit être une fonction.');
		return;
	}
	if (renderItem !== undefined && typeof renderItem !== 'function') {
		console.error('renderMiniPaquetList: option "renderItem" doit être une fonction (ou être omise).');
		return;
	}

	const conteneur = ensureContainer(conteneurId);

	const renderId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	conteneur.dataset[renderKey] = renderId;
	const isStale = () => conteneur.dataset[renderKey] !== renderId;

	showLoading(conteneur, conteneurId);

	let paquetsResult;
	try {
		paquetsResult = await fetchPaquets();
	} catch (_) {
		if (isStale()) return;
		showError(conteneur, conteneurId);
		return;
	}

	if (isStale()) return;

	let paquets = normalizePaquetsResult(paquetsResult);
	if (!paquets) {
		if (isStale()) return;
		showError(conteneur, conteneurId);
		return;
	}

	paquets = paquets.filter(filtre);
	paquets.sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));

	setMiniTableCount(conteneurId, paquets.length);
	conteneur.removeAttribute('aria-busy');
	const loading = conteneur.querySelector('[data-mini-table-loading]');
	if (loading) loading.remove();

	if (paquets.length === 0) {
		conteneur.innerHTML = htmlVide;
		return;
	}

	let currentPage = 1;
	const totalPages = Math.ceil(paquets.length / parPage);

	function renderPagination(page) {
		if (totalPages <= 1) return;
		const nav = document.createElement('nav');
		nav.className = 'pagination-paquet d-flex justify-content-center mt-2';
		nav.setAttribute('aria-label', 'Pagination');
		const ul = document.createElement('ul');
		ul.className = 'pagination pagination-sm mb-0';

		const makeBtn = (label, onClick, { disabled = false, active = false, ariaLabel = null } = {}) => {
			const li = document.createElement('li');
			li.className = `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'page-link';
			btn.textContent = String(label);
			if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
			if (disabled) btn.disabled = true;
			if (active) btn.setAttribute('aria-current', 'page');
			btn.addEventListener('click', onClick);
			li.appendChild(btn);
			return li;
		};

		ul.appendChild(makeBtn('‹', () => {
			if (currentPage > 1) {
				currentPage--;
				renderPage(currentPage);
			}
		}, { disabled: page === 1, ariaLabel: 'Page précédente' }));

		const model = buildPageModel(page, totalPages);
		for (const item of model) {
			if (item === '...') {
				const li = document.createElement('li');
				li.className = 'page-item disabled';
				const span = document.createElement('span');
				span.className = 'page-link';
				span.textContent = '…';
				li.appendChild(span);
				ul.appendChild(li);
				continue;
			}
			ul.appendChild(makeBtn(item, () => {
				currentPage = item;
				renderPage(currentPage);
			}, { active: item === page }));
		}

		ul.appendChild(makeBtn('›', () => {
			if (currentPage < totalPages) {
				currentPage++;
				renderPage(currentPage);
			}
		}, { disabled: page === totalPages, ariaLabel: 'Page suivante' }));

		nav.appendChild(ul);
		conteneur.appendChild(nav);
	}

	function renderPage(page) {
		conteneur.querySelectorAll('[data-mini-list], .pagination-paquet').forEach(e => e.remove());
		const startIdx = (page - 1) * parPage;
		const endIdx = startIdx + parPage;
		const pagePaquets = paquets.slice(startIdx, endIdx);

		const list = document.createElement('div');
		list.className = 'd-flex flex-column gap-2 align-items-center';
		list.setAttribute('data-mini-list', '');

		const fragment = document.createDocumentFragment();
		pagePaquets.forEach((paquet) => {
			const card = document.createElement('div');
			card.className = classeCarte;
			card.setAttribute('role', 'button');
			card.setAttribute('tabindex', '0');

			if (renderItem) {
				const rendered = renderItem(paquet);
				const title = typeof rendered === 'string' ? rendered : (rendered?.title ?? paquet?.cote ?? '');
				const subtitle = typeof rendered === 'string' ? '' : (rendered?.subtitle ?? '');

				const row = document.createElement('div');
				row.className = 'd-flex justify-content-between align-items-start gap-2';

				const left = document.createElement('div');
				left.className = 'fw-semibold';
				left.textContent = String(title || '');
				row.appendChild(left);

				if (subtitle) {
					const right = document.createElement('div');
					right.className = 'text-muted small text-nowrap';
					right.textContent = String(subtitle);
					row.appendChild(right);
				}

				card.appendChild(row);
			} else {
				card.textContent = paquet?.cote || '';
			}

			card.setAttribute('aria-label', `Ouvrir le paquet ${paquet?.cote || ''}`.trim());

			const open = () => ouvrirPaquet(paquet);
			card.addEventListener('click', open);
			card.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					open();
				}
			});
			fragment.appendChild(card);
		});

		list.appendChild(fragment);
		conteneur.appendChild(list);
		renderPagination(page);
	}

	renderPage(currentPage);
}
