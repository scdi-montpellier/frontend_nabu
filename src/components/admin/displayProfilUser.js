// Affiche un popup temporaire (succès ou erreur)
function showPopup(message, type = 'success') {
	// type: 'success' | 'error'
	const existing = document.getElementById('popup-message');
	if (existing) existing.remove();
	const popup = document.createElement('div');
	popup.id = 'popup-message';
	popup.className = `position-fixed top-0 start-50 translate-middle-x mt-4 px-4 py-2 rounded shadow-lg fw-bold text-center text-white ${type === 'success' ? 'bg-success' : 'bg-danger'}`;
	popup.style.zIndex = 2000;
	popup.textContent = message;
	document.body.appendChild(popup);
	setTimeout(() => {
		popup.classList.add('opacity-0');
		setTimeout(() => popup.remove(), 400);
	}, 2000);
}
export function afficherProfilUtilisateur(user) {
	   if (!user) return;

	   const existingModal = document.getElementById('profilUtilisateurModal');
	   if (existingModal) existingModal.remove();

	   // Récupérer le rôle de l'utilisateur courant (admin uniquement peut supprimer)
	import('../../API/users/currentUser.js').then(async ({ getCurrentUser }) => {
		   const currentUser = await getCurrentUser();
		   const currentRoleId = currentUser ? Number(currentUser.roleId) : NaN;
		   const isAdmin = Number.isFinite(currentRoleId) && currentRoleId === 1;
		   const isSystemUser = user.email === 'utilisateur.supprime@nabu.local';
		   const viewedRoleId = Number(user.roleId);

		   const modal = document.createElement('div');
		   modal.className = 'modal fade';
		   modal.id = 'profilUtilisateurModal';
		   modal.tabIndex = -1;
		   modal.setAttribute('aria-hidden', 'true');

		   const role = {
			   label: viewedRoleId === 1 ? 'Admin' : viewedRoleId === 2 ? 'Utilisateur' : 'Inconnu',
			   badge: viewedRoleId === 1 ? 'bg-success' : viewedRoleId === 2 ? 'bg-primary' : 'bg-secondary'
		   };

		   modal.innerHTML = `
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content shadow-lg">
				<div class="modal-header">
					<h5 class="modal-title">Profil de l'utilisateur</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
				</div>

				   <div class="modal-body">
					   <div class="container">
						   <div class="row align-items-center mb-1" style="gap:0;">
							   <div class="col-4 text-end text-muted small pe-1" style="min-width:70px;max-width:90px;">Nom :</div>
							   <div class="col-8 text-start fw-semibold ps-1" style="min-width:0;">${user.nom ?? '-'}</div>
						   </div>
						   <div class="row align-items-center mb-1" style="gap:0;">
							   <div class="col-4 text-end text-muted small pe-1" style="min-width:70px;max-width:90px;">Prénom :</div>
							   <div class="col-8 text-start fw-semibold ps-1" style="min-width:0;">${user.prenom ?? '-'}</div>
						   </div>
						   <div class="row align-items-center mb-1" style="gap:0;">
							   <div class="col-4 text-end text-muted small pe-1" style="min-width:70px;max-width:90px;">Email :</div>
							   <div class="col-8 text-start fw-semibold ps-1" style="min-width:0;">${user.email ?? '-'}</div>
						   </div>
						   <div class="row align-items-center mb-1" style="gap:0;">
							   <div class="col-4 text-end text-muted small pe-1" style="min-width:70px;max-width:90px;">Rôle :</div>
							   <div class="col-8 text-start ps-1" style="min-width:0;"><span class="badge ${role.badge}">${role.label}</span></div>
						   </div>
					   </div>
				   </div>

				   <div class="modal-footer justify-content-center">
					   ${!isSystemUser ? '<button id="btn-modifier-mdp" class="btn btn-warning">Modifier mot de passe</button>' : ''}
					   ${isAdmin && !isSystemUser ? '<button id="btn-supprimer-user" class="btn btn-danger">Supprimer</button>' : ''}
				   </div>
				   <div id="card-modifier-mdp" class="d-none position-absolute top-50 start-50 translate-middle" style="z-index:1056; min-width:320px; max-width:90vw;">
					   <div class="card shadow border-0">
						   <div class="card-header bg-warning text-dark fw-bold">Modifier le mot de passe</div>
						   <div class="card-body">
							   <form id="form-modifier-mdp" autocomplete="off">
								   <div class="mb-3">
									   <label for="input-nouveau-mdp" class="form-label">Nouveau mot de passe</label>
									   <div class="input-group">
										   <input type="password" class="form-control" id="input-nouveau-mdp" placeholder="Entrer le nouveau mot de passe" autocomplete="new-password">
										   <button type="button" class="btn btn-outline-secondary" id="toggle-nouveau-mdp" tabindex="-1" aria-label="Afficher/masquer le mot de passe">
											   <span id="eye-nouveau-mdp">
												   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
													   <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.133 13.133 0 0 1 1.172 8z"/>
													   <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
												   </svg>
											   </span>
										   </button>
									   </div>
								   </div>
								   <div class="d-flex justify-content-end gap-2">
									   <button id="btn-annuler-mdp" type="button" class="btn btn-outline-secondary">Annuler</button>
									   <button id="btn-valider-mdp" type="submit" class="btn btn-warning">Valider</button>
								   </div>
							   </form>
						   </div>
					   </div>
				   </div>
			</div>
		</div>
	`;

		   document.body.appendChild(modal);

		   const bootstrapModal = new bootstrap.Modal(modal);
		   bootstrapModal.show();

		   //  Suppression utilisateur
		   if (isAdmin && !isSystemUser) {
			   const btnSupprimerUser = modal.querySelector('#btn-supprimer-user');
			   if (btnSupprimerUser) {
				   btnSupprimerUser.addEventListener('click', () => {
					   document.getElementById('confirm-delete-user-card')?.remove();
					   const infoModal = document.getElementById('profilUtilisateurModal');
					   if (infoModal) infoModal.remove();

					   // Création de la card de confirmation
					   const card = document.createElement('div');
					   card.id = 'confirm-delete-user-card';
					   card.className = 'position-fixed top-50 start-50 translate-middle shadow-lg p-0';
					   card.style.zIndex = 3000;
					   card.style.minWidth = '320px';
					   card.style.maxWidth = '90vw';
					   card.innerHTML = `
						   <div class="card border-danger">
							   <div class="card-header bg-danger text-white fw-bold text-center">Confirmer la suppression</div>
							   <div class="card-body text-center">
								   <p>Voulez-vous vraiment supprimer l'utilisateur <strong>${user.nom} ${user.prenom}</strong> ?</p>
								   <div class="d-flex justify-content-center gap-3 mt-3">
									   <button id="btn-cancel-delete-user" class="btn btn-secondary">Annuler</button>
									   <button id="btn-confirm-delete-user" class="btn btn-danger">Supprimer</button>
								   </div>
							   </div>
						   </div>
					   `;
					   document.body.appendChild(card);

					   // Annuler
					   card.querySelector('#btn-cancel-delete-user').onclick = () => {
						   card.remove();
						   document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
						   // Réafficher la modale d'information utilisateur
						   afficherProfilUtilisateur(user);
					   };
					   // Confirmer
					   card.querySelector('#btn-confirm-delete-user').onclick = async () => {
						   const { deleteUser } = await import('../../API/users/users.js');
						   const result = await deleteUser(user.id);
						   card.remove();
						   if (result && result.success) {
							   showPopup('Utilisateur supprimé avec succès.', 'success');
							   setTimeout(() => {
								   if (window.location.hash === '#/admin' && typeof window.navigate === 'function') {
									   window.navigate('/admin');
								   } else {
									   window.location.reload();
								   }
							   }, 1200);
						   } else {
							   showPopup(result && result.message ? result.message : 'Erreur lors de la suppression.', 'error');
						   }
					   };
				   });
			   }
		   }
			   const btnModifierMdp = modal.querySelector('#btn-modifier-mdp');
			   const cardModifierMdp = modal.querySelector('#card-modifier-mdp');
			   const formModifierMdp = cardModifierMdp.querySelector('#form-modifier-mdp');
			   const inputNouveauMdp = cardModifierMdp.querySelector('#input-nouveau-mdp');
			   const btnAnnulerMdp = cardModifierMdp.querySelector('#btn-annuler-mdp');

			   const btnToggleNouveauMdp = cardModifierMdp.querySelector('#toggle-nouveau-mdp');
			   const eyeNouveauMdp = cardModifierMdp.querySelector('#eye-nouveau-mdp');
			   if (btnModifierMdp && cardModifierMdp && inputNouveauMdp && btnAnnulerMdp && formModifierMdp && btnToggleNouveauMdp && eyeNouveauMdp) {
				   // Afficher/masquer le mot de passe
				   btnToggleNouveauMdp.addEventListener('click', () => {
					   const type = inputNouveauMdp.type === 'password' ? 'text' : 'password';
					   inputNouveauMdp.type = type;
					   // Changer l'icône
					   eyeNouveauMdp.innerHTML = type === 'password'
						   ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.133 13.133 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>`
						   : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-eye-slash" viewBox="0 0 16 16"><path d="M13.359 11.238C14.06 10.47 14.682 9.607 15.104 9c-.058-.087-.122-.183-.195-.288-.335-.48-.83-1.12-1.465-1.755C11.879 4.668 10.12 3.5 8 3.5c-.86 0-1.67.163-2.418.457l.823.823A5.978 5.978 0 0 1 8 4.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.335.48-.83 1.12-1.465 1.755-.27.27-.56.54-.88.808l.876.875z"/><path d="M11.297 9.176a3 3 0 0 0-4.473-4.473l.823.823a2 2 0 1 1 2.827 2.827l.823.823zm-7.072-7.072a.75.75 0 0 1 1.06 0l12 12a.75.75 0 0 1-1.06 1.06l-1.397-1.397A7.978 7.978 0 0 1 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.133 13.133 0 0 1 1.172 8c.335-.48.83-1.12 1.465-1.755.27-.27.56-.54.88-.808l-.876-.875a.75.75 0 0 1 1.06-1.06l1.397 1.397z"/></svg>`;
				   });
				   btnModifierMdp.addEventListener('click', () => {
					   cardModifierMdp.classList.remove('d-none');
					   inputNouveauMdp.value = '';
					   inputNouveauMdp.focus();
				   });
				   btnAnnulerMdp.addEventListener('click', () => {
					   cardModifierMdp.classList.add('d-none');
				   });
				   formModifierMdp.addEventListener('submit', async (e) => {
					   e.preventDefault();
					   const newPassword = inputNouveauMdp.value;
					   if (newPassword && newPassword.trim().length > 0) {
						   const { updateUserPassword } = await import('../../API/users/users.js');
						   const result = await updateUserPassword(user.id, newPassword);
						   if (result && result.success) {
							   cardModifierMdp.classList.add('d-none');
							   showPopup('Mot de passe modifié avec succès.', 'success');
						   } else {
							   showPopup('Erreur lors de la modification du mot de passe.', 'error');
						   }
					   } else {
						   inputNouveauMdp.classList.add('is-invalid');
						   setTimeout(() => inputNouveauMdp.classList.remove('is-invalid'), 1200);
					   }
				   });
			   }

			   // Nettoyage après fermeture
			   modal.addEventListener('hidden.bs.modal', () => modal.remove());
		   });
}
