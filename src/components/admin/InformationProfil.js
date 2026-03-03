import { fetchOneUser } from '../../API/users/users.js';

export async function afficherCardProfilConnecte(containerSelector = 'main') {
	const container = document.querySelector(containerSelector);
	if (!container) return;

	// Loading spinner
	container.innerHTML = `
		<div class="d-flex justify-content-center my-5">
			<div class="spinner-border text-dark" role="status"></div>
		</div>
	`;

	try {
		const result = await fetchOneUser();
		const user = result?.data ?? result;

		if (!user || !user.id) {
			container.innerHTML = `
				<div class="alert alert-warning text-center my-4">
					Impossible de charger le profil utilisateur.
				</div>
			`;
			return;
		}


		   // Détermination du rôle
		   const roleId = Number(user.roleId);
		   const role = roleId === 1 ? 'Admin' : roleId === 2 ? 'Utilisateur' : 'Inconnu';
		   const badge = roleId === 1 ? 'bg-success' : roleId === 2 ? 'bg-primary' : 'bg-secondary';

		   // Initiales de l'utilisateur
		   function getInitials(nom, prenom) {
			   const n = (nom || '').trim();
			   const p = (prenom || '').trim();
			   if (!n && !p) return '?';
			   if (n && p) return (p[0] + n[0]).toUpperCase();
			   return (n[0] || p[0]).toUpperCase();
		   }
		   const initials = getInitials(user.nom, user.prenom);

		const card = document.createElement('div');
		card.className = 'card shadow-sm my-4';
		   card.innerHTML = `
			   <div class="card-header d-flex align-items-center gap-2">
				   <span class="d-flex align-items-center justify-content-center rounded-circle bg-secondary text-white fw-bold me-2" style="width: 40px; height: 40px; font-size: 1.2rem;">${initials}</span>
				   <span class="fw-semibold fs-5">Profil utilisateur connecté</span>
				   <span class="badge ${badge}">${role}</span>
			   </div>
			   <div class="card-body">
				   <ul class="list-group list-group-flush mb-3">
					   <li class="list-group-item"><strong>Nom :</strong> ${user.nom ?? ''}</li>
					   <li class="list-group-item"><strong>Prénom :</strong> ${user.prenom ?? ''}</li>
					   <li class="list-group-item"><strong>Email :</strong> ${user.email ?? ''}</li>
				   </ul>
				   <!-- Pas de modification de profil -->
			   </div>
		   `;

		container.innerHTML = '';
		container.appendChild(card);

		// Pas de bouton de modification de profil
	} catch (err) {
		container.innerHTML = `
			<div class="alert alert-danger text-center my-4">
				Erreur lors du chargement du profil utilisateur.
			</div>
		`;
	}
}
