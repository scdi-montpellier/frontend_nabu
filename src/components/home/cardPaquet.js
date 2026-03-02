import { fetchOnePaquet, deletePaquet } from '../../API/paquet/paquet.js';
import { fetchAllStatus } from '../../API/paquet/status.js';
import { fetchAllCorpus } from '../../API/paquet/corpus.js';

import { normalizeStatus, renderStatusBadge, initBootstrapTooltips } from '../status/badgeStatus.js';

let STATUS_CACHE = null;
let CORPUS_CACHE = null;

function escapeHtml(value) {
	if (value === null || value === undefined) return '';
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function displayValue(value, fallback = '—') {
	const v = String(value ?? '').trim();
	return v ? escapeHtml(v) : fallback;
}

function isFlagTruthy(value) {
	if (value === true) return true;
	if (value === false || value === 0 || value === null || value === undefined) return false;
	if (typeof value === 'number') return value !== 0;
	const v = String(value).trim().toLowerCase();
	if (!v) return false;
	const asNumber = Number(v);
	if (!Number.isNaN(asNumber)) return asNumber !== 0;
	return v === 'true' || v === 'oui' || v === 'yes';
}

async function getStatusById(statusId) {
	if (statusId === null || statusId === undefined || statusId === '') return null;

	if (typeof statusId === 'object') return statusId;

	const trimmed = typeof statusId === 'string' ? statusId.trim() : statusId;

	if (trimmed === 0 || trimmed === '0' || Number(trimmed) === 0) {
		return { idStatus: 0, nameStatus: 'INEXISTANT' };
	}

	if (typeof trimmed === 'string' && trimmed !== '' && Number.isNaN(Number(trimmed))) {
		return { nameStatus: trimmed };
	}
	if (!STATUS_CACHE) {
		const result = await fetchAllStatus();
		const list = result?.data || result;
		STATUS_CACHE = Array.isArray(list) ? list : [];
	}
	return STATUS_CACHE.find(s => (s.idstatus ?? s.idStatus ?? s.id) == trimmed) || null;
}

async function getCorpusNameById(corpusId) {
	if (!corpusId) return null;
	if (!CORPUS_CACHE) {
		const result = await fetchAllCorpus();
		const list = result?.data || result;
		CORPUS_CACHE = Array.isArray(list) ? list : [];
	}
	const corpus = CORPUS_CACHE.find(c => (c.idcorpus ?? c.idCorpus) == corpusId) || null;
	return (corpus?.name_corpus ?? corpus?.nameCorpus) || null;
}

const formatDate = date => {
	if (!date) return '';
	const parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) return '';
	return parsed.toLocaleString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
};

const formatUserName = paquet => {
	const prenom = (paquet?.userPrenom ?? paquet?.prenom ?? '').toString().trim();
	const nom = (paquet?.userNom ?? paquet?.nom ?? '').toString().trim();
	const full = `${prenom} ${nom}`.trim();
	return full || 'Inconnu';
};

function showToast(message, success = true) {
	const toast = document.createElement('div');
	toast.className = `toast align-items-center text-white ${success ? 'bg-success' : 'bg-danger'} border-0 position-fixed top-0 start-50 translate-middle-x mt-4`;
	toast.style.zIndex = 3000;
	toast.innerHTML = `
		<div class="d-flex">
			<div class="toast-body">${message}</div>
			<button class="btn-close btn-close-white me-2 m-auto"></button>
		</div>
	`;
	document.body.appendChild(toast);
	setTimeout(() => toast.classList.add('show'), 10);
	setTimeout(() => toast.remove(), 2500);
}

export async function afficherCardPaquetModal(paquet) {
	document.getElementById('paquet-modal-overlay')?.remove();
	const overlay = document.createElement('div');
	overlay.id = 'paquet-modal-overlay';
	overlay.className = 'modal fade show';
	overlay.style.display = 'block';
	overlay.style.background = 'rgba(0,0,0,0.5)';
	overlay.style.zIndex = 2000;
	const dialog = document.createElement('div');
	dialog.className = 'modal-dialog modal-lg modal-dialog-centered';
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = `
		<div class="modal-header">
			<h5 class="modal-title fw-bold w-100 text-center">Informations du paquet</h5>
			<button class="btn-close"></button>
		</div>
		<div class="modal-body"></div>
	`;
	content.querySelector('.btn-close').addEventListener('click', () => overlay.remove());
	content.querySelector('.modal-body').appendChild(await createCardPaquet(paquet));
	dialog.appendChild(content);
	overlay.appendChild(dialog);
	document.body.appendChild(overlay);
	initBootstrapTooltips(overlay);
	overlay.addEventListener('click', e => {
		if (e.target === overlay) overlay.remove();
	});
}

export async function createCardPaquet(paquet) {
	const statusRef = paquet?.status ?? paquet?.statusId ?? paquet?.nameStatus ?? paquet?.name_status ?? null;
	// Si aucun statut n'est fourni, on affiche par défaut "INEXISTANT".
	const status = await getStatusById(statusRef ?? 0);
	const statusMeta = normalizeStatus(status);
	const corpusName =
		displayValue(paquet?.corpusName ?? paquet?.name_corpus, '') ||
		displayValue(await getCorpusNameById(paquet?.corpusId), '') ||
		'';

	const card = document.createElement('div');
	card.className = 'card shadow border-0';

	const userRole = localStorage.getItem('userRole');
	// Le bouton supprimer n'est visible que pour l'admin et si le status n'est pas ENVOI_OK
	const isDeleteVisible = userRole === 'admin' && statusMeta?.name !== 'ENVOI_OK';

	const dossier = displayValue(paquet?.folderName);
	const cote = displayValue(paquet?.cote);
	const microFilmImage = displayValue(paquet?.microFilmImage);
	const imageColor = displayValue(paquet?.imageColor);
	const searchArchiving = displayValue(paquet?.searchArchiving);
	const commentaire = displayValue(paquet?.commentaire, '');
	const lastModif = formatDate(paquet?.lastmodifDate) || '—';
	const modifiedBy = escapeHtml(formatUserName(paquet));

	card.innerHTML = `
		<div class="card-header bg-white border-0 pb-0">
			<div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
				<div class="flex-grow-1">
					<div class="text-muted small">Paquet</div>
					<div class="h5 mb-1 fw-bold">${cote}</div>
					<div class="text-muted small">Dossier : <span class="fw-semibold text-body">${dossier}</span></div>
				</div>
				<div class="text-end">${renderStatusBadge(status)}</div>
			</div>
			<hr class="mt-3 mb-0" />
		</div>

		<div class="card-body pt-3">
			<div class="row g-3">
				<div class="col-12 col-lg-6">
					<div class="border rounded p-3 h-100 bg-light">
						<div class="fw-bold mb-2">Métadonnées</div>
						<div class="d-flex justify-content-between gap-3">
							<span class="text-muted">Corpus</span>
							<span class="fw-semibold text-end">${corpusName || '—'}</span>
						</div>
						<div class="d-flex justify-content-between gap-3 mt-2">
							<span class="text-muted">Recherche archivage</span>
							<span class="fw-semibold text-end">${searchArchiving}</span>
						</div>
					</div>
				</div>

				<div class="col-12 col-lg-6">
					<div class="border rounded p-3 h-100 bg-light">
						<div class="fw-bold mb-2">Chemins</div>
						<div class="mb-2">
							<div class="text-muted small">Répertoire images autre</div>
							<div class="fw-semibold text-break">${microFilmImage}</div>
						</div>
						<div>
							<div class="text-muted small">Répertoire images couleurs</div>
							<div class="fw-semibold text-break">${imageColor}</div>
						</div>
					</div>
				</div>
			</div>

			<div class="row g-3 mt-1">
				<div class="col-12">
					<div class="border rounded p-3">
						<div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
							<div class="d-flex gap-4 flex-wrap">
								<div class="text-center">
									<div class="text-muted small">À faire</div>
									<span class="badge bg-${isFlagTruthy(paquet?.toDo) ? 'success' : 'secondary'}">${isFlagTruthy(paquet?.toDo) ? 'Oui' : 'Non'}</span>
								</div>
								<div class="text-center">
									<div class="text-muted small">Multi-volume</div>
									<span class="badge bg-${isFlagTruthy(paquet?.facileTest) ? 'success' : 'secondary'}">${isFlagTruthy(paquet?.facileTest) ? 'Oui' : 'Non'}</span>
								</div>
								<div class="text-center">
									<div class="text-muted small">SIP</div>
									<span class="badge bg-${isFlagTruthy(paquet?.filedSip) ? 'success' : 'secondary'}">${isFlagTruthy(paquet?.filedSip) ? 'Oui' : 'Non'}</span>
								</div>
							</div>
							<div class="text-muted small text-end">
								<div>Dernière modification : <span class="fw-semibold text-body">${escapeHtml(lastModif)}</span></div>
								<div>Modifié par : <span class="fw-semibold text-body">${modifiedBy}</span></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-3">
				<div class="fw-bold mb-2">Commentaire</div>
				<div class="border rounded p-3 bg-light">${commentaire || '<span class="text-muted">—</span>'}</div>
			</div>

			<div class="d-flex justify-content-center justify-content-md-end gap-2 flex-wrap mt-4">
				<button class="btn btn-primary" id="edit"><i class="bi bi-pencil"></i> Modifier</button>
				${isDeleteVisible ? `<button class="btn btn-danger" id="delete"><i class="bi bi-trash"></i> Supprimer</button>` : ''}
				<button class="btn btn-success" id="historique"><i class="bi bi-clock-history"></i> Historique d'envoi</button>
			</div>
		</div>
	`;

	card.querySelector('#edit').addEventListener('click', async () => {
		document.getElementById('paquet-modal-overlay')?.remove();
		const { afficherCardPaquetEditModal } = await import('../editPaquet/editPaquet.js');
		afficherCardPaquetEditModal(paquet);
	});

	if (isDeleteVisible) {
		card.querySelector('#delete').addEventListener('click', () => showDeleteConfirmation(paquet));
	}

	card.querySelector('#historique')?.addEventListener('click', async () => {
		const { afficherCardHistoriqueEnvoi } = await import('./CardHistoriqueEnvoi.js');
		afficherCardHistoriqueEnvoi(paquet.cote);
	});

	return card;
}

async function showDeleteConfirmation(paquet) {
	document.getElementById('delete-modal-overlay')?.remove();
	const overlay = document.createElement('div');
	overlay.id = 'delete-modal-overlay';
	overlay.className = 'modal fade show';
	overlay.style.display = 'block';
	overlay.style.background = 'rgba(0,0,0,0.5)';
	overlay.style.zIndex = 3000;
	const dialog = document.createElement('div');
	dialog.className = 'modal-dialog modal-dialog-centered';
	const content = document.createElement('div');
	content.className = 'modal-content';
	content.innerHTML = `
		<div class="modal-header">
			<h5 class="modal-title w-100 text-center">Confirmer la suppression</h5>
			<button class="btn-close"></button>
		</div>
		<div class="modal-body text-center">
			<p>Voulez-vous vraiment supprimer définitivement le paquet <strong>${paquet.cote}</strong> ?</p>
		</div>
		<div class="modal-footer justify-content-center">
			<button class="btn btn-secondary" id="cancel-delete">Annuler</button>
			<button class="btn btn-danger" id="confirm-delete">Supprimer</button>
		</div>
	`;
	content.querySelector('.btn-close').onclick = () => overlay.remove();
	content.querySelector('#cancel-delete').onclick = () => overlay.remove();
	content.querySelector('#confirm-delete').onclick = async () => {
		const result = await deletePaquet(paquet.cote);
		overlay.remove();
		if (result?.success) {
			showToast('Paquet supprimé');
			setTimeout(() => location.reload(), 1000);
		} else {
			showToast('Erreur lors de la suppression', false);
		}
	};
	dialog.appendChild(content);
	overlay.appendChild(dialog);
	document.body.appendChild(overlay);
	overlay.addEventListener('click', e => {
		if (e.target === overlay) overlay.remove();
	});
}

export async function afficherCardPaquet(paquet, containerSelector = 'main') {
	const container = document.querySelector(containerSelector);
	if (!container) return;
	container.innerHTML = '';
	const card = await createCardPaquet(paquet);
	container.appendChild(card);
	initBootstrapTooltips(card);
}

export async function afficherCardPaquetDepuisAPI(id, containerSelector = 'main') {
	const data = await fetchOnePaquet(id);
	const paquet = data?.data || data;
	if (!paquet) {
		document.querySelector(containerSelector).innerHTML = '<div class="alert alert-danger">Erreur de chargement</div>';
		return;
	}
	await afficherCardPaquet(paquet, containerSelector);
}
