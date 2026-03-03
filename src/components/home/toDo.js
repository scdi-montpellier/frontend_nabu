
import { fetchAllPaquets } from '../../API/paquet/paquet.js';
import { afficherCardPaquetModal } from '../home/cardPaquet.js';

function setMiniTableCount(conteneurId, count) {
	const badge = document.querySelector(`[data-count-for="${conteneurId}"]`);
	if (badge) badge.textContent = String(count);
}

// Affiche le tableau des paquets à faire 
export async function afficherTableauToDoPaquet(conteneurId = 'to-do-paquet-conteneur') {
	let conteneur = document.getElementById(conteneurId);
	if (!conteneur) {
		conteneur = document.createElement('div');
		conteneur.id = conteneurId;
		document.body.appendChild(conteneur);
	}

	const renderId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	conteneur.dataset.toDoRenderId = renderId;
	const isStale = () => conteneur.dataset.toDoRenderId !== renderId;

	// État de chargement (header géré par la page)
	setMiniTableCount(conteneurId, '…');
	conteneur.innerHTML = `
		<div class="text-center text-muted small" data-mini-table-loading>
			<div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
			Chargement...
		</div>
	`;

	// Récupère tous les paquets
	const paquetsResult = await fetchAllPaquets();
	if (isStale()) return;
	let paquets = paquetsResult && paquetsResult.data ? paquetsResult.data : paquetsResult;
	if (!paquets || !Array.isArray(paquets)) {
		if (isStale()) return;
		setMiniTableCount(conteneurId, 0);
		conteneur.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des paquets.</div>';
		return;
	}
	// Filtre : paquets à faire 
	paquets = paquets.filter(p => p.toDo);
	// Tri (si date dispo) : plus récent d'abord
	paquets.sort((a, b) => {
		const da = a?.lastmodifDate || a?.date || null;
		const db = b?.lastmodifDate || b?.date || null;
		const ta = da ? new Date(da).getTime() : 0;
		const tb = db ? new Date(db).getTime() : 0;
		return tb - ta;
	});

	setMiniTableCount(conteneurId, paquets.length);
	const loading = conteneur.querySelector('[data-mini-table-loading]');
	if (loading) loading.remove();
	if (paquets.length === 0) {
		conteneur.innerHTML = '<div class="text-muted text-center">Aucun paquet à faire.</div>';
		return;
	}

	// Pagination
	const PAQUETS_PAR_PAGE = 4;
	let currentPage = 1;
	const totalPages = Math.ceil(paquets.length / PAQUETS_PAR_PAGE);

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
		const startIdx = (page - 1) * PAQUETS_PAR_PAGE;
		const endIdx = startIdx + PAQUETS_PAR_PAGE;
		const pagePaquets = paquets.slice(startIdx, endIdx);

		const list = document.createElement('div');
		list.className = 'd-flex flex-column gap-2 align-items-center';
		list.setAttribute('data-mini-list', '');
		pagePaquets.forEach((p) => {
			const card = document.createElement('div');
			card.className = 'card shadow-sm paquet-mini-item paquet-mini-item--todo w-100 paquet-mini-card px-3 py-2 text-start';
			card.setAttribute('role', 'button');
			card.setAttribute('tabindex', '0');
			card.textContent = p.cote || '';
			const open = () => afficherCardPaquetModal(p);
			card.addEventListener('click', open);
			card.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					open();
				}
			});
			list.appendChild(card);
		});
		conteneur.appendChild(list);

		renderPagination(page);
	}

	renderPage(currentPage);
}

window.afficherTableauToDoPaquet = afficherTableauToDoPaquet;
