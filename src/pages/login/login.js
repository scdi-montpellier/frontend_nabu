
import { initNavbar } from '../../components/navbar.js';

export default function loginPage() {
	initNavbar('header', true);

	document.documentElement.classList.add('page-login');
	document.body.classList.add('page-login');

	const main = document.querySelector('main') || createMain();
	main.innerHTML = `
		<section class="login-shell">
			<div class="login-card card shadow-sm">
				<div class="login-header text-center">
					<img class="login-logo" src="public/image/favicon.ico" alt="Logo">
					<h1 class="login-title h3 mb-1">Connexion</h1>
					<p class="login-subtitle text-muted mb-0">Numérisation Archivage Bibliothèque Universitaire</p>
				</div>

				<form id="loginForm" autocomplete="on" class="mt-4" novalidate>
					<div class="mb-3">
						<label for="email" class="form-label">Email</label>
						<input type="email" class="form-control" id="email" required autocomplete="username" inputmode="email">
					</div>

					<div class="mb-2">
						<label for="password" class="form-label">Mot de passe</label>
						<div class="input-group">
							<input type="password" class="form-control" id="password" required autocomplete="current-password">
							<button class="btn btn-outline-secondary" type="button" id="togglePassword" aria-label="Afficher/masquer le mot de passe" aria-pressed="false">
								<span id="eyeIcon" aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="currentColor"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>
								</span>
							</button>
						</div>
					</div>

					<div class="d-grid mt-4">
						<button type="submit" class="btn btn-primary" id="loginSubmit">
							<span id="loginSpinner" class="spinner-border spinner-border-sm me-2" style="display:none;" role="status" aria-hidden="true"></span>
							<span>Connexion</span>
						</button>
					</div>

					<div id="loginError" class="alert alert-danger mt-3 mb-0" style="display:none;" role="alert" aria-live="polite"></div>
				</form>
			</div>
		</section>
	`;

	// Gestion du formulaire
	const form = document.getElementById('loginForm');
	const passwordInput = document.getElementById('password');
	const togglePassword = document.getElementById('togglePassword');
	const eyeIcon = document.getElementById('eyeIcon');
	const spinner = document.getElementById('loginSpinner');
	const errorDiv = document.getElementById('loginError');
	const submitBtn = document.getElementById('loginSubmit');

	// Afficher/masquer le mot de passe
	if (togglePassword) {
		togglePassword.addEventListener('click', () => {
			const type = passwordInput.type === 'password' ? 'text' : 'password';
			passwordInput.type = type;
			togglePassword.setAttribute('aria-pressed', type === 'text' ? 'true' : 'false');
			if (eyeIcon) {
				// Changer l'icône SVG selon l'état
				if (type === 'password') {
					eyeIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="currentColor"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>`;
				} else {
					eyeIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="currentColor"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm-36-108 224-224q8-8 8-20t-8-20q-8-8-20-8t-20 8l-224 224q-8 8-8 20t8 20q8 8 20 8t20-8Zm36 300q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>`;
				}
			}
		});
	}

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		errorDiv.style.display = 'none';
		errorDiv.textContent = '';
		spinner.style.display = 'inline-block';
		if (submitBtn) submitBtn.disabled = true;
		form.setAttribute('aria-busy', 'true');
		const email = document.getElementById('email').value.trim();
		const password = passwordInput.value;
		try {
			const { login } = await import('../../API/auth/auth.js');
			const result = await login(email, password);
			if (result && (result.success === true || result.authenticated === true)) {

				if (result.user && result.user.role) {
					localStorage.setItem('userRole', result.user.role);
				} else {
					localStorage.removeItem('userRole');
				}
				window.location.href = 'index.html';
			} else {
				errorDiv.textContent = 'Email ou mot de passe incorrect.';
				errorDiv.style.display = 'block';
			}
		} catch (err) {
			errorDiv.textContent = 'Email ou mot de passe incorrect.';
			errorDiv.style.display = 'block';
		} finally {
			spinner.style.display = 'none';
			if (submitBtn) submitBtn.disabled = false;
			form.removeAttribute('aria-busy');
		}
	});

}

function createMain() {
	const main = document.createElement('main');
	document.body.appendChild(main);
	return main;
}

// Enleve le scroll sur cette page
export function cleanupLoginPage() {
	document.documentElement.classList.remove('page-login');
	document.body.classList.remove('page-login');
}
