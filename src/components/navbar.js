const NAV_COLLAPSE_ID = 'navbarNav';
let currentHashChangeHandler;

function getRouteFromHash() {
    const hash = window.location.hash || '#/';
    const route = hash.startsWith('#') ? hash.slice(1) : hash;
    const normalized = route.startsWith('/') ? route : `/${route}`;
    return normalized.split('?')[0].split('#')[0] || '/';
}

function setNavItemVisible(elementId, isVisible) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.classList.toggle('d-none', !isVisible);
}

function updateActiveNavLinks(navRoot = document) {
    const route = getRouteFromHash();
    const links = navRoot.querySelectorAll('a.nav-link[data-route]');

    links.forEach((link) => {
        const linkRoute = link.getAttribute('data-route');
        const isActive = linkRoute === '/'
            ? route === '/'
            : (route === linkRoute || route.startsWith(`${linkRoute}/`));
        link.classList.toggle('active', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

function collapseNavbarIfOpen(navElement) {
    const collapseElement = navElement?.querySelector?.(`#${NAV_COLLAPSE_ID}`);
    if (!collapseElement) return;

    const isShown = collapseElement.classList.contains('show');
    if (!isShown) return;

    const bootstrapApi = window.bootstrap;
    if (!bootstrapApi?.Collapse) return;

    bootstrapApi.Collapse.getOrCreateInstance(collapseElement).hide();
}

export function createNavbar(isLoginPage = false) {
    const brandIconMarkup = `
        <img
            src="public/image/favicon.ico"
            alt="Logo NABU"
            width="60"
            height="60"
            class="d-inline-block"
        />
    `;

    const brandTitleMarkup = isLoginPage
        ? `<span class="navbar-brand nabu-title mb-0 fw-bold lh-1 fs-3">NABU</span>`
        : `<a class="navbar-brand nabu-title mb-0 fw-bold lh-1 fs-3" href="#/">NABU</a>`;

    const subtitleMarkup = `<span class="nabu-subtitle text-white-50 small lh-1">SCDI de Montpellier</span>`;

    const brandBlockMarkup = `
        <div class="d-flex align-items-center gap-2">
            ${brandIconMarkup}
            <div class="d-flex flex-column align-items-start">
                ${brandTitleMarkup}
                ${subtitleMarkup}
            </div>
        </div>
    `;

    if (isLoginPage) {
        return `
            <nav class="navbar navbar-dark bg-dark py-2" data-bs-theme="dark">
                <div class="container-fluid">
                    ${brandBlockMarkup}
                </div>
            </nav>
        `;
    }

    return `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark py-2" data-bs-theme="dark">
            <div class="container-fluid">
                ${brandBlockMarkup}

                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#${NAV_COLLAPSE_ID}" aria-controls="${NAV_COLLAPSE_ID}" aria-expanded="false" aria-label="Ouvrir le menu">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="${NAV_COLLAPSE_ID}">
                    <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
                        <li class="nav-item">
                            <a class="nav-link" href="#/about" data-route="/about">À propos</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#/" data-route="/">Accueil</a>
                        </li>
                        <li class="nav-item d-none" id="envoiNavItem">
                            <a class="nav-link" href="#/envoi" data-route="/envoi">Envoi</a>
                        </li>
                        <li class="nav-item d-none" id="adminNavItem">
                            <a class="nav-link" href="#/admin" data-route="/admin">Admin</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" id="logoutBtn">Déconnexion</a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `;
}

export function initNavbar(selector = 'header', isLoginPage = false) {
    const headerElement = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!headerElement) return;

    headerElement.innerHTML = createNavbar(isLoginPage);

    if (isLoginPage) return;

    updateActiveNavLinks(headerElement);

    if (currentHashChangeHandler) {
        window.removeEventListener('hashchange', currentHashChangeHandler);
    }
    currentHashChangeHandler = () => updateActiveNavLinks(headerElement);
    window.addEventListener('hashchange', currentHashChangeHandler);

    if (!headerElement.dataset.navbarClickBound) {
        headerElement.dataset.navbarClickBound = 'true';
        headerElement.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const navLink = target.closest('a.nav-link');
            if (!navLink) return;

            if (navLink.id === 'logoutBtn') return;
            collapseNavbarIfOpen(headerElement);
        });
    }

    (async () => {
        try {
            const { getCurrentUser } = await import('../API/users/currentUser.js');
            const currentUser = await getCurrentUser();
            const isAdmin = Boolean(currentUser && currentUser.roleId === 1);
            setNavItemVisible('adminNavItem', isAdmin);
            setNavItemVisible('envoiNavItem', isAdmin);
        } catch (error) {
            console.error('Erreur lors de la récupération de l’utilisateur courant', error);
        }
    })();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && !logoutBtn.dataset.bound) {
        logoutBtn.dataset.bound = 'true';
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const { logout } = await import('../API/auth/auth.js');
                await logout();
            } catch (error) {
                console.error('Erreur lors de la déconnexion', error);
            }
            window.location.href = 'index.html';
        });
    }
}