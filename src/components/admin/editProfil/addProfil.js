
import { register } from '../../../API/auth/auth.js';

export function afficherModalAjoutProfil() {
	const existingModal = document.getElementById('ajoutProfilModal');
	if (existingModal) existingModal.remove();

	const modal = document.createElement('div');
	modal.className = 'modal fade';
	modal.id = 'ajoutProfilModal';
	modal.tabIndex = -1;
	modal.setAttribute('aria-hidden', 'true');

	modal.innerHTML = `
		<div class="modal-dialog modal-dialog-centered">
			<div class="modal-content shadow-lg">
				<div class="modal-header">
					<h5 class="modal-title">Créer un profil utilisateur</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
				</div>
				<div class="modal-body">
					<form id="form-ajout-profil" autocomplete="off">
						<div class="mb-3">
							<label for="input-nom" class="form-label">Nom</label>
							<input type="text" class="form-control" id="input-nom" required>
						</div>
						<div class="mb-3">
							<label for="input-prenom" class="form-label">Prénom</label>
							<input type="text" class="form-control" id="input-prenom" required>
						</div>
						<div class="mb-3">
							<label for="input-email" class="form-label">Email</label>
							<input type="email" class="form-control" id="input-email" required>
						</div>
						<div class="mb-3">
							<label for="input-password" class="form-label">Mot de passe</label>
							<div class="input-group">
								<input type="password" class="form-control" id="input-password" required autocomplete="new-password">
								<button class="btn btn-outline-secondary" type="button" id="toggle-password-visibility" tabindex="-1" style="border: 1px solid #ced4da; background: #fff;">
									<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#0B6EFD"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
								</button>
							</div>
						</div>
						<div class="mb-3">
							<label for="select-role" class="form-label">Rôle</label>
							<select class="form-select" id="select-role" required>
								<option value="" disabled selected>Choisir un rôle</option>
								<option value="1">Admin</option>
								<option value="2">Utilisateur</option>
							</select>
						</div>
						<div id="ajout-profil-message" class="mb-2"></div>
						<div class="d-grid gap-2">
							<button type="submit" class="btn btn-primary">Créer le profil</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	`;

	document.body.appendChild(modal);

	// Bootstrap modal
	const bootstrapModal = new bootstrap.Modal(modal);
	bootstrapModal.show();

	// Gestion de l'affichage du mot de passe
	const passwordInput = modal.querySelector('#input-password');
	const togglePasswordBtn = modal.querySelector('#toggle-password-visibility');
	if (togglePasswordBtn && passwordInput) {
		togglePasswordBtn.addEventListener('click', () => {
			const isPassword = passwordInput.type === 'password';
			passwordInput.type = isPassword ? 'text' : 'password';
			togglePasswordBtn.innerHTML = isPassword
				? `<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24px\" viewBox=\"0 -960 960 960\" width=\"24px\" fill=\"#0B6EFD\"><path d=\"M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z\"/></svg>`
				: `<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24px\" viewBox=\"0 -960 960 960\" width=\"24px\" fill=\"#6c757d\"><path d=\"M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z\"/></svg>`;
		});
	}

	// Gestion du formulaire
	const form = modal.querySelector('#form-ajout-profil');
	const messageDiv = modal.querySelector('#ajout-profil-message');
	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		messageDiv.textContent = '';
		messageDiv.className = '';

		const nom = modal.querySelector('#input-nom').value.trim();
		const prenom = modal.querySelector('#input-prenom').value.trim();
		const email = modal.querySelector('#input-email').value.trim();
		const password = modal.querySelector('#input-password').value;
		const roleId = parseInt(modal.querySelector('#select-role').value, 10);

		if (!nom || !prenom || !email || !password || !roleId) {
			messageDiv.textContent = 'Veuillez remplir tous les champs.';
			messageDiv.className = 'alert alert-warning';
			return;
		}

		try {
			await register({ nom, prenom, email, password, roleId });
			messageDiv.textContent = 'Profil créé avec succès !';
			messageDiv.className = 'alert alert-success';
			form.reset();
		} catch (err) {
			messageDiv.textContent = "Erreur lors de la création du profil.";
			messageDiv.className = 'alert alert-danger';
		}
	});

	// Nettoyage après fermeture
	modal.addEventListener('hidden.bs.modal', () => modal.remove());
}
