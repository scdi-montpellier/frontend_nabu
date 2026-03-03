
import { fetchAllusers } from '../../API/users/users.js';
import { afficherProfilUtilisateur } from './displayProfilUser.js';
import { afficherCardProfilConnecte } from './InformationProfil.js';
import { afficherModalAjoutProfil } from './editProfil/addProfil.js';


export async function afficherCardUtilisateurs(containerSelector = 'main') {
	const container = document.querySelector(containerSelector);
	if (!container) return;

	container.innerHTML = `
		<div class="row g-4">
			<div class="col-lg-8 col-12" id="users-table-col"></div>
			<div class="col-lg-4 col-12" id="profil-connecte-col"></div>
		</div>
	`;

	const tableCol = container.querySelector('#users-table-col');
	const profilCol = container.querySelector('#profil-connecte-col');

	tableCol.innerHTML = `
		<div class="d-flex justify-content-center my-5">
			<div class="spinner-border" role="status" aria-label="Chargement">
				<span class="visually-hidden">Chargement…</span>
			</div>
		</div>
	`;

	profilCol.innerHTML = `
		<div class="d-flex justify-content-center my-5">
			<div class="spinner-border" role="status" aria-label="Chargement">
				<span class="visually-hidden">Chargement…</span>
			</div>
		</div>
	`;

	try {

		const result = await fetchAllusers();
		const users = result?.data ?? result;

		if (!Array.isArray(users) || users.length === 0) {
			tableCol.innerHTML = `
				<div class="alert alert-warning text-center my-4">
					Aucun utilisateur trouvé
				</div>
			`;
		} else {
			const card = document.createElement('div');
			card.className = 'card shadow-sm border-0';
			card.innerHTML = `
				<div class="card-header bg-body-tertiary d-flex align-items-center justify-content-between flex-wrap gap-2">
					<div class="d-flex align-items-center gap-2">
						<span class="fw-semibold">
							<i class="bi bi-people me-2" aria-hidden="true"></i>
							Utilisateurs
						</span>
						<span class="badge text-bg-info">${users.length}</span>
					</div>
					<div class="d-flex align-items-center gap-2">
						<button id="btn-ajouter-profil" type="button" class="btn btn-primary btn-sm">
							<i class="bi bi-person-plus me-1" aria-hidden="true"></i>
							Création de profil
						</button>
					</div>
				</div>
				<div class="card-body p-0">
					<div class="table-responsive">
							<table class="table table-hover table-striped align-middle mb-0" id="table-users">
								<caption class="visually-hidden">Liste des utilisateurs</caption>
								<thead class="table-dark text-center align-middle">
								<tr>
									<th>Nom</th>
									<th>Prénom</th>
									<th>Email</th>
									<th>Rôle</th>
								</tr>
							</thead>
							<tbody class="text-center">
								${users.map((user, idx) => `
										<tr data-user-idx="${idx}" role="button" tabindex="0">
										<td>${user.nom ?? ''}</td>
										<td>${user.prenom ?? ''}</td>
										<td>${user.email ?? ''}</td>
										<td>
										<span class="badge ${
												Number(user.roleId) === 1
													? 'bg-success'
													: Number(user.roleId) === 2
												? 'bg-primary'
												: 'bg-dark'
										}">
											${Number(user.roleId) === 1 ? 'Admin' : Number(user.roleId) === 2 ? 'Utilisateur' : 'Inconnu'}
											</span>
										</td>
									</tr>
								`).join('')}
							</tbody>
						</table>
					</div>
				</div>
			`;
			tableCol.innerHTML = '';
			tableCol.appendChild(card);

			const table = card.querySelector('#table-users');
			if (table) {
				table.querySelectorAll('tbody tr').forEach(tr => {
					const open = () => {
						const idx = tr.getAttribute('data-user-idx');
						if (users[idx]) afficherProfilUtilisateur(users[idx], containerSelector);
					};
					tr.addEventListener('click', open);
					tr.addEventListener('keydown', (e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							open();
						}
					});
				});
			}

			// le bouton Ajouter
			const btnAjouterProfil = card.querySelector('#btn-ajouter-profil');
			if (btnAjouterProfil) {
				btnAjouterProfil.addEventListener('click', () => {
					afficherModalAjoutProfil();
				});
			}
		}

		// Affichage du profil connecté à droite
		profilCol.classList.add('sticky-lg');
		await afficherCardProfilConnecte('#profil-connecte-col');

	} catch (error) {
		tableCol.innerHTML = `
			<div class="alert alert-danger text-center my-4">
				Erreur lors du chargement des utilisateurs
			</div>
		`;
		profilCol.innerHTML = '';
		console.error(error);
	}
}
