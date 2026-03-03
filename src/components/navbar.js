export function createNavbar(isLoginPage = false) {
    if (isLoginPage) {
        return `
            <nav class="navbar navbar-expand-lg navbar-dark" style="background-color: #212529; padding: 0.5rem 1rem; min-height: 48px;">
                <div class="container-fluid">
                    <div class="d-flex flex-column align-items-start">
                        <span class="navbar-brand nabu-title text-white fw-bold mb-0" style="line-height: 1; font-size: 1.7rem;">NABU</span>
                        <span class="nabu-title text-white" style="font-size: 0.85rem; font-weight: 400; margin-top: -0.2rem; letter-spacing: 0.5px;">SCDI de Montpellier</span>
                    </div>
                </div>
            </nav>
        `;
    }
    return `
        <nav class="navbar navbar-expand-lg navbar-dark" style="background-color: #212529; padding: 0.5rem 1rem; min-height: 48px;">
            <div class="container-fluid">
                <div class="d-flex flex-column align-items-start">
                    <a class="navbar-brand nabu-title text-white fw-bold mb-0" href="index.html" style="line-height: 1; font-size: 1.7rem;">NABU</a>
                    <span class="nabu-title text-white" style="font-size: 0.85rem; font-weight: 400; margin-top: -0.2rem; letter-spacing: 0.5px;">SCDI de Montpellier</span>
                </div>
                <button class="navbar-toggler border border-white" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"><span></span></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                            <a class="nav-link text-white" href="#/about">A propos</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#/">Accueil</a>
                        </li>
                        <li class="nav-item" id="envoiNavItem" style="display:none;">
                            <a class="nav-link text-white" href="#/envoi">Envoi</a>
                        </li>
                        <li class="nav-item" id="adminNavItem" style="display:none;">
                            <a class="nav-link text-white" href="#/admin">Admin</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link text-white" href="#" id="logoutBtn">Déconnexion</a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `;
}

export function initNavbar(selector = 'header', isLoginPage = false) {
    const headerElement = document.querySelector(selector);
    if (headerElement) {
        headerElement.innerHTML = createNavbar(isLoginPage);
        if (!isLoginPage) {
            import('../API/users/currentUser.js').then(async ({ getCurrentUser }) => {
                const currentUser = await getCurrentUser();
                if (currentUser && currentUser.roleId === 1) {
                    const adminNavItem = document.getElementById('adminNavItem');
                    if (adminNavItem) adminNavItem.style.display = '';
                    const envoiNavItem = document.getElementById('envoiNavItem');
                    if (envoiNavItem) envoiNavItem.style.display = '';
                }
            });
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        const { logout } = await import('../API/auth/auth.js');
                        await logout();
                    } catch (err) {
                        console.error('Erreur lors de la déconnexion', err);
                    }
                    window.location.href = 'index.html';
                });
            }
        }
    }
}