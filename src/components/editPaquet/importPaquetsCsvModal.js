import { createPaquet as creerPaquet } from '../../API/paquet/paquet.js';
import { fetchAllCorpus as recupererTousLesCorpus } from '../../API/paquet/corpus.js';
import {
	showPopup as afficherPopup,
	escapeHtml as echapperHtml,
	refreshPaquetTables as rafraichirTablesPaquets,
} from './paquetModalShared.js';

function verrouillerDefilementPage() {
	const overflowPrecedent = document.body.style.overflow;
	document.body.style.overflow = 'hidden';
	document.body.classList.add('modal-open');
	return () => {
		document.body.style.overflow = overflowPrecedent;
		document.body.classList.remove('modal-open');
	};
}

function versEntierOuNull(value) {
	if (value === null || value === undefined) return null;
	const s = String(value).trim();
	if (!s) return null;
	if (!Number.isFinite(Number(s))) return null;
	return parseInt(s, 10);
}

function normaliserEntete(value) {
	const raw = String(value || '').trim().toLowerCase();
	const noDiacritics = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	return noDiacritics
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function detecterSeparateur(premiereLigne) {
	const line = String(premiereLigne || '');
	const semi = (line.match(/;/g) || []).length;
	const comma = (line.match(/,/g) || []).length;
	const tab = (line.match(/\t/g) || []).length;
	if (tab > semi && tab > comma) return '\t';
	if (semi > comma) return ';';
	return ',';
}

function parserCsv(texte) {
	const src = String(texte || '').replace(/^\uFEFF/, '');
	const lines = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
	const nonEmptyLines = lines.filter(l => l.trim() !== '');
	if (nonEmptyLines.length === 0) return { delimiter: ',', rows: [] };

	const delimiter = detecterSeparateur(nonEmptyLines[0]);

	const rows = nonEmptyLines.map(line => {
		const cells = [];
		let current = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				if (inQuotes && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
				continue;
			}
			if (!inQuotes && ch === delimiter) {
				cells.push(current);
				current = '';
				continue;
			}
			current += ch;
		}
		cells.push(current);
		return cells.map(c => (c ?? '').toString().trim());
	});

	return { delimiter, rows };
}

function convertirLigneEnPaquet(objetLigne) {
	const cote = String(objetLigne.cote || '').trim();
	const folderName = String(
		objetLigne.folderName ||
		objetLigne.folder_name ||
		objetLigne.dossier ||
		objetLigne.nom_dossier ||
		objetLigne.nomdossier ||
		objetLigne.nom_du_dossier ||
		''
	).trim();
	const comment = String(
		objetLigne.comment || objetLigne.commentaire || objetLigne.comments || objetLigne.remarque || ''
	).trim();

	const usersId = versEntierOuNull(objetLigne.usersId ?? objetLigne.userId ?? objetLigne.users_idusers ?? localStorage.getItem('userId'));
	const corpusId = versEntierOuNull(objetLigne.corpusId ?? objetLigne.corpus_id ?? objetLigne.corpus_idcorpus ?? objetLigne.corpus);

	const paquet = {
		cote,
		folderName: folderName || cote,
		comment: comment || null,
		usersId: usersId ?? null,
	};
	if (corpusId) paquet.corpusId = corpusId;

	return paquet;
}

function creerModalDom() {
	document.getElementById('import-paquets-csv-overlay')?.remove();

	const overlay = document.createElement('div');
	overlay.id = 'import-paquets-csv-overlay';
	overlay.className = 'modal fade show';
	overlay.style.display = 'block';
	overlay.style.background = 'rgba(0,0,0,0.5)';
	overlay.style.zIndex = 3100;
	overlay.tabIndex = -1;
	overlay.setAttribute('role', 'dialog');
	overlay.setAttribute('aria-modal', 'true');
	overlay.setAttribute('aria-labelledby', 'import-paquets-csv-title');

	const dialog = document.createElement('div');
	dialog.className = 'modal-dialog modal-dialog-centered modal-lg';

	const content = document.createElement('div');
	content.className = 'modal-content shadow';

	content.innerHTML = `
		<div class="modal-header py-3">
			<div class="w-100 text-center">
				<h5 class="modal-title fw-bold mb-0" id="import-paquets-csv-title">Importer des paquets</h5>
				<div class="text-muted small mt-1">Format CSV avec en-tête (header) obligatoire</div>
			</div>
			<button type="button" class="btn-close" aria-label="Fermer"></button>
		</div>
		<div class="modal-body pt-3">
			<div class="vstack gap-3">
				<div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
					<div class="text-muted small">
						<div>
							<span class="fw-semibold">Obligatoire :</span> <span class="fw-semibold">cote</span>
							<span class="text-muted">•</span>
							<span class="fw-semibold">Optionnelles :</span> dossier, commentaire, corpus (ID)
						</div>
						<div>
							<span class="fw-semibold">Délimiteur :</span> ; ou , (auto-détecté)
						</div>
					</div>
					<div class="flex-shrink-0">
						<button type="button" class="btn btn-sm btn-outline-primary" id="csv-download-template">Télécharger le modèle</button>
					</div>
				</div>

				<div class="alert alert-light border small mb-0" role="status" aria-live="polite">
					<div class="fw-semibold">Aide : IDs des corpus</div>
					<div class="text-muted">Champ API <span class="fw-semibold">idcorpus</span> → colonne <span class="fw-semibold">corpus</span></div>
					<div id="csv-corpus-hint" class="text-muted mt-2">
						<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
						<span>Chargement de la liste des corpus…</span>
					</div>
				</div>

				<div>
					<div id="csv-drop-zone" class="border border-2 rounded-3 p-4 text-center bg-body-tertiary" style="border-style:dashed; cursor:pointer;" role="button" tabindex="0" aria-describedby="csv-drop-help">
						<div class="fw-semibold">Glisser-déposer un fichier CSV</div>
						<div id="csv-drop-help" class="small text-muted mt-1">ou cliquez pour sélectionner un fichier</div>
						<input id="csv-file-input" type="file" accept=".csv,text/csv" class="d-none" />
					</div>
					<div class="form-text mt-2">Astuce : une ligne vide est ignorée.</div>
				</div>

				<div id="csv-selected" class="alert alert-info d-none mb-0" role="status"></div>
				<div id="csv-result" class="alert d-none mb-0" role="status"></div>
			</div>
		</div>
		<div class="modal-footer justify-content-center gap-2 py-3">
			<button type="button" class="btn btn-outline-secondary" id="csv-cancel">Annuler</button>
			<button type="button" class="btn btn-primary" id="csv-import" disabled>
				<span class="csv-import-label">Importer</span>
				<span class="csv-import-loading d-none" aria-hidden="true">
					<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
					Import en cours…
				</span>
			</button>
		</div>
	`;

	dialog.appendChild(content);
	overlay.appendChild(dialog);
	document.body.appendChild(overlay);

	const deverrouillerDefilement = verrouillerDefilementPage();
	const destroy = () => {
		try {
			overlay.remove();
		} finally {
			deverrouillerDefilement();
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

	const closeBtn = content.querySelector('.btn-close');
	closeBtn?.addEventListener('click', destroy);
	setTimeout(() => {
		try {
			closeBtn?.focus?.();
		} catch (_) {
		}
	}, 0);
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) destroy();
	});
	content.querySelector('#csv-cancel')?.addEventListener('click', destroy);

	return { overlay, content, destroy };
}

function telechargerModeleCsv() {
	const contenu = 'nom_dossier;cote;commentaire;corpus\n';
	const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'paquet.csv';
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function afficherAideCorpus(content) {
	const zone = content?.querySelector?.('#csv-corpus-hint');
	if (!zone) return;

	let listeCorpus;
	try {
		listeCorpus = await recupererTousLesCorpus();
		listeCorpus = listeCorpus?.data || listeCorpus;
	} catch (_) {
		listeCorpus = null;
	}

	if (!Array.isArray(listeCorpus) || listeCorpus.length === 0) {
		zone.innerHTML = '<span class="text-danger">Impossible de récupérer la liste des corpus.</span>';
		return;
	}

	const items = listeCorpus
		.map((c) => {
			const id = c?.idcorpus ?? '';
			const label = c?.name_corpus ?? '';
			return { id: String(id).trim(), label: String(label).trim() };
		})
		.filter((x) => x.id && x.label);

	items.sort((a, b) => {
		const ai = Number(a.id);
		const bi = Number(b.id);
		if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
		return a.id.localeCompare(b.id, 'fr', { numeric: true });
	});

	if (items.length === 0) {
		zone.innerHTML = '<span class="text-muted">Aucun corpus disponible.</span>';
		return;
	}

	const lignes = items
		.slice(0, 50)
		.map((x) => `<div><span class="fw-semibold">${echapperHtml(x.id)}</span> — ${echapperHtml(x.label)}</div>`)
		.join('');

	const suffix = items.length > 50
		? `<div class="text-muted mt-1">Affichage limité à 50 corpus (sur ${echapperHtml(String(items.length))}).</div>`
		: '';

	zone.innerHTML = `<div style="max-height: 140px; overflow:auto;">${lignes}</div>${suffix}`;
}

export function ouvrirModalImportPaquetsCsv() {
	const { content, destroy } = creerModalDom();
	afficherAideCorpus(content);

	const zoneDepot = content.querySelector('#csv-drop-zone');
	const inputFichier = content.querySelector('#csv-file-input');
	const infoFichier = content.querySelector('#csv-selected');
	const zoneResultat = content.querySelector('#csv-result');
	const boutonImporter = content.querySelector('#csv-import');
	const boutonTelecharger = content.querySelector('#csv-download-template');
	const zoneLabelImport = content.querySelector('#csv-import .csv-import-label');
	const zoneLoadingImport = content.querySelector('#csv-import .csv-import-loading');

	let fichierSelectionne = null;
	let importEnCours = false;

	const setEtatImport = (enCours) => {
		importEnCours = Boolean(enCours);
		if (zoneLabelImport && zoneLoadingImport) {
			zoneLabelImport.classList.toggle('d-none', importEnCours);
			zoneLoadingImport.classList.toggle('d-none', !importEnCours);
		}
		if (boutonImporter) boutonImporter.disabled = !fichierSelectionne || importEnCours;
	};

	const afficherResultat = (message, type = 'secondary') => {
		if (!zoneResultat) return;
		zoneResultat.className = `alert alert-${type} mt-3`;
		zoneResultat.innerHTML = message;
		zoneResultat.classList.remove('d-none');
	};

	const effacerResultat = () => {
		if (!zoneResultat) return;
		zoneResultat.classList.add('d-none');
		zoneResultat.innerHTML = '';
	};

	const definirFichierSelectionne = (file) => {
		fichierSelectionne = file;
		effacerResultat();
		if (infoFichier) {
			if (!file) {
				infoFichier.classList.add('d-none');
				infoFichier.innerHTML = '';
			} else {
				const sizeKb = Math.round(file.size / 1024);
				infoFichier.innerHTML = `
					<div class="d-flex align-items-center justify-content-between gap-2 flex-wrap">
						<div>
							<div class="fw-semibold">Fichier sélectionné</div>
							<div class="text-muted small">${echapperHtml(file.name)} · ${echapperHtml(String(sizeKb))} Ko</div>
						</div>
						<span class="badge text-bg-info">Prêt à importer</span>
					</div>
				`;
				infoFichier.classList.remove('d-none');
			}
		}
		if (boutonImporter) boutonImporter.disabled = !file || importEnCours;
	};

	const definirDepotActif = (actif) => {
		if (!zoneDepot) return;
		zoneDepot.classList.toggle('border-primary', actif);
		zoneDepot.classList.toggle('bg-body', actif);
		zoneDepot.classList.toggle('bg-body-tertiary', !actif);
	};

	boutonTelecharger?.addEventListener('click', () => {
		try {
			telechargerModeleCsv();
		} catch (_) {
			afficherPopup('Téléchargement du CSV impossible.', false);
		}
	});

	zoneDepot?.addEventListener('click', () => inputFichier?.click());
	zoneDepot?.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			inputFichier?.click();
		}
	});

	inputFichier?.addEventListener('change', () => {
		const f = inputFichier.files && inputFichier.files[0] ? inputFichier.files[0] : null;
		definirFichierSelectionne(f);
	});

	['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
		zoneDepot?.addEventListener(eventName, (e) => {
			e.preventDefault();
			e.stopPropagation();
		});
	});

	zoneDepot?.addEventListener('dragenter', () => definirDepotActif(true));
	zoneDepot?.addEventListener('dragover', () => definirDepotActif(true));
	zoneDepot?.addEventListener('dragleave', () => definirDepotActif(false));
	zoneDepot?.addEventListener('drop', (e) => {
		definirDepotActif(false);
		const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
		definirFichierSelectionne(f);
	});

	const lireFichierEnTexte = (file) => new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ''));
		reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
		reader.readAsText(file);
	});

	boutonImporter?.addEventListener('click', async () => {
		if (!fichierSelectionne || importEnCours) return;
		setEtatImport(true);
		effacerResultat();

		let texte = '';
		try {
			texte = await lireFichierEnTexte(fichierSelectionne);
		} catch (e) {
			afficherResultat('Impossible de lire le fichier CSV.', 'danger');
			setEtatImport(false);
			return;
		}

		const { rows } = parserCsv(texte);
		if (!rows || rows.length < 2) {
			afficherResultat('CSV invalide : header + au moins une ligne de données requis.', 'warning');
			setEtatImport(false);
			return;
		}

		const entetes = rows[0].map(h => normaliserEntete(h));
		const lignesDonnees = rows.slice(1);
		if (!entetes.some(h => h === 'cote')) {
			afficherResultat('Header manquant : la colonne "cote" est obligatoire.', 'warning');
			setEtatImport(false);
			return;
		}

		const lignes = [];
		for (let idx = 0; idx < lignesDonnees.length; idx++) {
			const cellules = lignesDonnees[idx];
			const objet = {};
			for (let c = 0; c < entetes.length; c++) {
				const cle = entetes[c];
				if (!cle) continue;
				objet[cle] = cellules[c] ?? '';
			}
			lignes.push(objet);
		}

		const erreurs = [];
		let nbOk = 0;
		let nbIgnores = 0;

		for (let i = 0; i < lignes.length; i++) {
			const ligne = lignes[i];
			const cote = String(ligne.cote || '').trim();
			if (!cote) {
				nbIgnores++;
				continue;
			}

			const paquet = convertirLigneEnPaquet(ligne);
			if (!paquet.folderName) paquet.folderName = cote;

			try {
				const res = await creerPaquet(paquet);
				if (res && (res.success || res.status === 'success')) {
					nbOk++;
				} else {
					const msg = res?.message || res?.error || 'Erreur inconnue';
					erreurs.push({ cote, message: msg });
				}
			} catch (e) {
				erreurs.push({ cote, message: e?.message || 'Erreur inconnue' });
			}
		}

		try {
			await rafraichirTablesPaquets();
		} catch (_) {
		}

		if (erreurs.length === 0) {
			afficherResultat(
				`Import terminé : <strong>${nbOk}</strong> paquet(s) créé(s).${nbIgnores ? ` <span class="text-muted">(${nbIgnores} ligne(s) ignorée(s))</span>` : ''}`,
				'success'
			);
			afficherPopup(`Import CSV : ${nbOk} créé(s)`, true);
			setTimeout(() => destroy(), 600);
		} else {
			const premieres = erreurs.slice(0, 5)
				.map(e => `<li><strong>${echapperHtml(e.cote)}</strong> : ${echapperHtml(e.message)}</li>`)
				.join('');
			afficherResultat(
				`Import terminé : <strong>${nbOk}</strong> créé(s), <strong>${erreurs.length}</strong> erreur(s).` +
				(nbIgnores ? ` <span class="text-muted">(${nbIgnores} ligne(s) ignorée(s))</span>` : '') +
				`<div class="mt-2 small">Premières erreurs :</div><ul class="small mb-0">${premieres}</ul>`,
				'warning'
			);
			afficherPopup(`Import CSV : ${nbOk} ok, ${erreurs.length} erreurs`, false);
		}

		setEtatImport(false);
	});

	setEtatImport(false);
	definirFichierSelectionne(null);
}
