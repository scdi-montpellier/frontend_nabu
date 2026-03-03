import { isAuthenticated } from './src/API/auth/auth.js';
import { getCurrentUser } from './src/API/users/currentUser.js';

const routes = {
	'/': {
		template: () => import('./src/pages/home/accueil.js'),
		script: './src/pages/home/accueil.js',
		title: 'Accueil'
	},
	'/about': {
		template: () => import('./src/pages/about/about.js'),
		script: './src/pages/about/about.js',
		title: 'À propos'
	},
	'/login': {
		template: () => import('./src/pages/login/login.js'),
		script: './src/pages/login/login.js',
		title: 'Connexion'
	},
	'/admin': {
		template: () => import('./src/pages/admin/admin.js'),
		script: './src/pages/admin/admin.js',
		title: 'Admin'
	},
	'/envoi': {
		template: () => import('./src/pages/download/sendding.js'),
		script: './src/pages/download/sendding.js',
		title: 'Envoi de fichier'
	}
};

function getOrCreateMain() {
	let main = document.querySelector('main');
	if (!main) {
		main = document.createElement('main');
		document.body.appendChild(main);
	}
	return main;
}

async function navigate(path) {
	// Vérifie l'authentification
	const authenticated = await isAuthenticated();
	const publicPaths = new Set(['/login', '/about']);
	if (!authenticated && !publicPaths.has(path)) {
		window.location.hash = '#/login';
		return;
	}
	if (authenticated && path === '/login') {
		window.location.hash = '#/';
		return;
	}

	// Restriction d'accès à la page admin : seul un user admin (roleId === 1) peut accéder
	if (path === '/admin') {
		const user = await getCurrentUser();
		if (!user || user.roleId !== 1) {
			window.location.hash = '#/';
			return;
		}
	}

	// Vide le contenu de <main> avant d'afficher la nouvelle page
	const main = getOrCreateMain();
	main.innerHTML = '';
	const route = routes[path] || routes['/'];
	document.title = route.title;
	route.template().then((module) => {
		if (module && typeof module.default === 'function') {
			module.default();
		}
	});
}

// Gestion du hashchange pour navigation 
window.addEventListener('hashchange', () => {
	const path = window.location.hash.replace('#', '') || '/';
	navigate(path);
});

// Navigation initiale
const initialPath = window.location.hash.replace('#', '') || '/';
navigate(initialPath);
