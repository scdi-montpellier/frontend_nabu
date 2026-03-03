import { initNavbar } from '../../components/navbar.js';
import { isAuthenticated } from '../../API/auth/auth.js';

export default async function aboutPage() {
	let authenticated = false;
	try {
		authenticated = await isAuthenticated();
	} catch {
		authenticated = false;
	}

	initNavbar('header', !authenticated);

	const main = document.querySelector('main') || createMain();
	main.className = 'bg-body py-4 py-lg-5';
	main.innerHTML = '';

	const container = document.createElement('div');
	container.className = 'container-xl';

	const pageHeader = document.createElement('div');
	pageHeader.className = 'mb-3 mb-lg-4';
	pageHeader.innerHTML = `
		<div class="d-flex flex-column gap-2">
			<div class="d-flex align-items-start justify-content-between flex-wrap gap-2">
				<div>
					<h1 class="h3 mb-1">À propos / Prise en main</h1>
					<div class="text-body-secondary">Guide rapide pour bien démarrer avec NABU</div>
				</div>
			</div>
			<div class="alert alert-info mb-0" role="note">
				<strong>Astuce :</strong> sur les badges de statut, survolez pour afficher l’aide (info-bulle).
			</div>
		</div>
	`;

	const layout = document.createElement('div');
	layout.className = 'row g-3 g-lg-4';

	const left = document.createElement('div');
	left.className = 'col-12 col-lg-4 col-xl-3';
	left.innerHTML = `
		<nav class="position-sticky" style="top: 1rem" aria-label="Sommaire">
			<div class="card shadow-sm">
				<div class="card-header bg-body-tertiary">
					<span class="fw-semibold">Sommaire</span>
				</div>
				<div class="card-body p-2">
					<div class="list-group list-group-flush">
						<button class="list-group-item list-group-item-action" type="button" data-scroll="a-quoi">À quoi sert NABU ?</button>
						<button class="list-group-item list-group-item-action" type="button" data-scroll="demarrer">Par où commencer</button>
						<button class="list-group-item list-group-item-action" type="button" data-scroll="paquets">Gestion des paquets</button>
						<button class="list-group-item list-group-item-action" type="button" data-scroll="envoi">Envoi ZIP (admin)</button>
						<button class="list-group-item list-group-item-action" type="button" data-scroll="statuts">Comprendre les statuts</button>
					</div>
				</div>
			</div>
		</nav>
	`;

	const right = document.createElement('div');
	right.className = 'col-12 col-lg-8 col-xl-9';
	right.innerHTML = `
		<section id="a-quoi" class="card shadow-sm" style="scroll-margin-top: 5rem">
			<div class="card-body p-3 p-lg-4">
				<div class="d-flex align-items-start justify-content-between flex-wrap gap-2">
					<div>
						<h2 class="h5 mb-1">À quoi sert NABU ?</h2>
						<div class="text-body-secondary">Suivi, pilotage et traçabilité des paquets</div>
					</div>
					<span class="badge text-bg-light border">Prise en main</span>
				</div>
				<hr class="my-3" />
				<p class="mb-0 lh-lg">
					NABU permet de <strong>suivre</strong> et <strong>piloter</strong> les paquets (SIP/ZIP) liés à la numérisation et à l’archivage.
					Vous y retrouvez les paquets, leurs <strong>statuts</strong>, et l’<strong>historique d’envoi</strong>.
				</p>
			</div>
		</section>

		<section id="demarrer" class="card shadow-sm mt-3" style="scroll-margin-top: 5rem">
			<div class="card-header bg-body-tertiary">
				<span class="fw-semibold">Par où commencer ?</span>
			</div>
			<div class="card-body p-3 p-lg-4">
				<ol class="mb-0 ps-3 lh-lg">
					<li class="mb-1">Se connecter</li>
					<li class="mb-1">Choisir un corpus</li>
					<li class="mb-1">Rechercher un paquet</li>
					<li class="mb-1">Ajouter / modifier un paquet</li>
					<li class="mb-0">(Admin) Envoyer un ZIP : immédiat ou différé</li>
				</ol>
			</div>
		</section>

		<section id="paquets" class="card shadow-sm mt-3" style="scroll-margin-top: 5rem">
			<div class="card-header bg-body-tertiary">
				<span class="fw-semibold">Gestion des paquets</span>
			</div>
			<div class="card-body p-3 p-lg-4">
				<div class="accordion" id="accordionPaquets">
					<div class="accordion-item">
						<h3 class="accordion-header">
							<button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseAdd" aria-expanded="true" aria-controls="collapseAdd">
								1) Ajouter un paquet
							</button>
						</h3>
						<div id="collapseAdd" class="accordion-collapse collapse show" data-bs-parent="#accordionPaquets">
							<div class="accordion-body lh-lg">
								<ul class="mb-0 ps-3">
									<li class="mb-2">Allez sur <a href="#/">Accueil</a>, puis dans le tableau <strong>Paquets</strong> cliquez sur <strong>Ajouter</strong> (à droite de la barre de recherche).</li>
									<li class="mb-2"><strong>Import CSV (en masse)</strong> : dans le même tableau, cliquez sur <strong>Importer</strong> (à côté de “Ajouter”). Dans la modale, vous pouvez <strong>télécharger le modèle</strong> puis glisser-déposer votre fichier CSV.</li>
									<li class="mb-2">Format CSV : <strong>en-tête obligatoire</strong> ; délimiteur <strong>;</strong> ou <strong>,</strong> (auto-détecté) ; colonnes attendues <strong>cote</strong> et <strong>nom_dossier</strong> (ou <strong>dossier</strong>), optionnelles <strong>commentaire</strong> et <strong>corpus</strong> (ID). Les lignes vides ou sans cote sont ignorées.</li>
									<li class="mb-2">Renseignez au minimum <strong>Nom dossier</strong> et <strong>Cote</strong> (champs obligatoires).</li>
									<li class="mb-2">Choisissez si besoin <strong>Corpus</strong> et <strong>Type de document</strong>.</li>
									<li class="mb-2"><strong>Statut</strong> : lors d’une création/modification manuelle, la liste est volontairement limitée (ex: <em>INEXISTANT</em>, <em>NON ENVOYE</em>). Les autres statuts sont gérés par le processus d’envoi.</li>
									<li class="mb-0">Option <strong>SIP</strong> : si cochée, NABU force le statut <em>NON ENVOYE</em> et verrouille le champ statut.</li>
								</ul>
							</div>
						</div>
					</div>

					<div class="accordion-item">
						<h3 class="accordion-header">
							<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseEdit" aria-expanded="false" aria-controls="collapseEdit">
								2) Modifier un paquet
							</button>
						</h3>
						<div id="collapseEdit" class="accordion-collapse collapse" data-bs-parent="#accordionPaquets">
							<div class="accordion-body lh-lg">
								<ul class="mb-0 ps-3">
									<li class="mb-2">Dans le tableau <strong>Paquets</strong>, cliquez sur une ligne pour ouvrir la fiche du paquet.</li>
									<li class="mb-2">Dans la fiche, cliquez sur <strong>Modifier</strong> pour ouvrir la modale d’édition.</li>
									<li class="mb-2">Vous pouvez aussi cocher/décocher <strong>À faire</strong> directement depuis le tableau (colonne “À faire”).</li>
									<li class="mb-0">Le bouton <strong>Historique d’envoi</strong> affiche les envois associés au paquet.</li>
								</ul>
							</div>
						</div>
					</div>

					<div class="accordion-item">
						<h3 class="accordion-header">
							<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseSearch" aria-expanded="false" aria-controls="collapseSearch">
								3) Rechercher un paquet (tableau)
							</button>
						</h3>
						<div id="collapseSearch" class="accordion-collapse collapse" data-bs-parent="#accordionPaquets">
							<div class="accordion-body lh-lg">
								<ul class="mb-0 ps-3">
									<li class="mb-2">Le champ <strong>Rechercher</strong> filtre le tableau (recherche globale sur les colonnes visibles).</li>
									<li class="mb-2">Filtre <strong>Statut</strong> (menu déroulant) : affiche uniquement les lignes ayant ce statut.</li>
									<li class="mb-2">Tri <strong>À faire</strong> : cliquez sur l’en-tête de colonne “À faire” pour remonter les paquets marqués en haut (recliquez pour désactiver).</li>
									<li class="mb-2">Tri <strong>Date</strong> : utilisez le contrôle de tri (asc/desc) pour prioriser les paquets selon la dernière modification.</li>
									<li class="mb-0">Navigation : choisissez le nombre de lignes et utilisez la pagination (Préc./Suiv. + numéro de page).</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section id="envoi" class="card shadow-sm mt-3" style="scroll-margin-top: 5rem">
			<div class="card-header bg-body-tertiary">
				<span class="fw-semibold">Envoi d’un ZIP : immédiat vs différé (admin)</span>
			</div>
			<div class="card-body p-3 p-lg-4 lh-lg">
				<ul class="mb-3 ps-3">
					<li class="mb-2">Le module <a href="#/envoi">Envoi</a> est réservé aux administrateurs.</li>
					<li class="mb-2">Étape 1 : sélectionnez (ou glissez-déposez) un fichier <strong>.zip</strong> puis cliquez <strong>Envoyer le fichier</strong> (upload vers le serveur).</li>
					<li class="mb-2">Si le paquet correspondant n’existe pas, NABU vous propose de le <strong>créer</strong> avant de continuer.</li>
					<li class="mb-2">Une fois l’upload terminé, NABU vous propose le mode de <strong>Transmission vers le CINES</strong> :</li>
					<li class="mb-2"><strong>Immédiat</strong> : déclenche l’envoi au CINES tout de suite et lance une vérification automatique de statut.</li>
					<li class="mb-2"><strong>Différé</strong> : programme l’envoi (mise en attente). Le paquet passe en “envoi différé / attente de prise en charge”.</li>
					<li class="mb-0">MD5 : NABU calcule un <strong>MD5 local</strong> et peut comparer au <strong>MD5 distant</strong> pour éviter un upload inutile ou proposer un remplacement.</li>
				</ul>
				<div class="alert alert-warning mb-0" role="note">
					Pendant un envoi immédiat, gardez la page ouverte : la vérification de statut CINES s’arrête si vous naviguez ailleurs.
				</div>
			</div>
		</section>

		<section id="statuts" class="card shadow-sm mt-3" style="scroll-margin-top: 5rem">
			<div class="card-body p-3 p-lg-4">
				<h2 class="h5 mb-3">Statuts : comment ça marche ?</h2>
				<div class="row g-3">
					<div class="col-12 col-lg-7">
						<p class="mb-3 lh-lg">
							Les statuts sont affichés sous forme de <strong>badges</strong>. Ils décrivent où en est le paquet dans le cycle de vie (ZIP généré, upload, envoi CINES, erreur…).
							Certains statuts sont <strong>mis à jour automatiquement</strong> lors des actions d’envoi.
						</p>
						<div class="table-responsive">
							<table class="table table-sm align-middle mb-0">
								<thead>
									<tr>
										<th scope="col">Statut</th>
										<th scope="col">Signification</th>
									</tr>
								</thead>
								<tbody>
									<tr><td><span class="badge text-bg-secondary">INEXISTANT</span></td><td>Aucun ZIP n’a été généré.</td></tr>
									<tr><td><span class="badge text-bg-secondary">NON ENVOYE</span></td><td>ZIP généré, aucun envoi vers le CINES.</td></tr>
									<tr><td><span class="badge text-bg-primary">ENVOI EN COURS</span></td><td>Envoi vers le CINES en cours.</td></tr>
									<tr><td><span class="badge text-bg-success">ENVOI OK</span></td><td>Envoi vers le CINES terminé avec succès.</td></tr>
									<tr><td><span class="badge text-bg-danger">ENVOI EN ERREUR</span></td><td>Échec de l’envoi (à vérifier puis relancer si nécessaire).</td></tr>
									<tr><td><span class="badge text-bg-warning">ENVOI EN PAUSE</span></td><td>Envoi mis en pause côté CINES.</td></tr>
									<tr><td><span class="badge text-bg-info">ENVOI SCDI OK</span></td><td>Transfert vers le serveur SCDI terminé.</td></tr>
									<tr><td><span class="badge text-bg-info">ENVOI SCDI ATTENTE</span></td><td>Envoi différé, en attente de prise en charge.</td></tr>
								</tbody>
							</table>
						</div>
					</div>
					<div class="col-12 col-lg-5">
						<div class="border rounded p-3 bg-body-tertiary h-100">
							<div class="fw-semibold mb-2">Bonnes pratiques</div>
							<ul class="mb-0 ps-3 lh-lg">
								<li class="mb-1">Avant de relancer un envoi, vérifiez le statut et l’historique.</li>
								<li class="mb-1">En “Différé”, le paquet est programmé : pas besoin de recliquer sauf erreur.</li>
								<li class="mb-0">En cas d’accès refusé, contactez un administrateur (droits).</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</section>
	`;

	layout.appendChild(left);
	layout.appendChild(right);

	container.appendChild(pageHeader);
	container.appendChild(layout);
	main.appendChild(container);

	container.querySelectorAll('[data-scroll]').forEach((button) => {
		button.addEventListener('click', () => {
			const targetId = button.getAttribute('data-scroll');
			const target = targetId ? document.getElementById(targetId) : null;
			if (!target) return;
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	});
}

function createMain() {
	const main = document.createElement('main');
	document.body.appendChild(main);
	return main;
}
