

import { afficherCardUtilisateurs } from '../../components/admin/displayAllProfil.js';

export default async function adminPage() {
	const main = document.querySelector('main') || createMain();

	const page = document.createElement('div');
	page.className = 'container-xxl py-4';
	page.innerHTML = `
		<div class="d-flex flex-column gap-2 mb-4">
			<div class="d-flex align-items-start justify-content-between flex-wrap gap-2">
				<div>
					<h1 class="h3 mb-1">Administration</h1>
					<div class="text-body-secondary">Gestion des utilisateurs et des profils</div>
				</div>
			</div>
		</div>

		<div class="card shadow-sm border-0">
			<div class="card-body p-3 p-lg-4" id="admin-users"></div>
		</div>
	`;

	main.appendChild(page);
	await afficherCardUtilisateurs('#admin-users');
}

function createMain() {
	const main = document.createElement('main');
	document.body.appendChild(main);
	return main;
}
