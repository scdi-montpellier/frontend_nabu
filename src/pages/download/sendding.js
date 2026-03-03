import { afficherStatus, chargerFeuilleDeStyle, chargerScript } from './helpersUI.js';
import { envoyerFichier, envoyerFichierAvecRemplacement } from './upload.js';
import { mettreAJourStatutPaquet } from './statutPaquet.js';
import { callVitamAPI } from '../../API/vitam/vitamAPI.js';

// === Dépendances UI externes ===
const BOOTSTRAP_CSS_URL = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
const FONTAWESOME_CSS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css';
const SPARK_MD5_URL = 'https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js';

function bootstrapCssDejaCharge() {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
    .some((link) => {
      const href = link.getAttribute('href') || '';
      
      return href.includes('bootstrap') && href.includes('dist/css') && href.includes('bootstrap.min.css');
    });
}

function nettoyerBootstrapCssDupliquee() {
  const styleLink = document.querySelector('link[rel="stylesheet"][href$="style.css"], link[rel="stylesheet"][href*="/style.css"]');
  const bootLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
    .filter((link) => {
      const href = link.getAttribute('href') || '';
      return href.includes('bootstrap') && href.includes('dist/css') && href.includes('bootstrap.min.css');
    });

  if (bootLinks.length <= 1) return;

  const hasBootstrapBeforeStyle = styleLink
    ? bootLinks.some((link) => (link.compareDocumentPosition(styleLink) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)
    : true;

  bootLinks.forEach((link, idx) => {
    if (!styleLink) {
      if (idx > 0) link.remove();
      return;
    }

    const isAfterStyle = (styleLink.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    if (hasBootstrapBeforeStyle && isAfterStyle) {
      link.remove();
    }
  });
}

function chargerBootstrapCssUneFois() {
  if (bootstrapCssDejaCharge()) return;
  chargerFeuilleDeStyle(BOOTSTRAP_CSS_URL);
}

function chargerFeuilleDeStyleUneFois(url) {
  const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some((link) => link.getAttribute('href') === url);
  if (exists) return;
  chargerFeuilleDeStyle(url);
}

function chargerScriptUneFois(url, { isReady } = {}) {
  if (typeof isReady === 'function' && isReady()) {
    return Promise.resolve();
  }

  const existing = Array.from(document.querySelectorAll('script[src]'))
    .find((script) => script.getAttribute('src') === url);

  if (existing) {
    if (typeof isReady !== 'function') {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error(`Timeout chargement script: ${url}`)), 15000);
      const tick = () => {
        if (isReady()) {
          clearTimeout(timeoutId);
          resolve();
          return;
        }
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  return chargerScript(url);
}

async function assurerDependancesUi() {
  nettoyerBootstrapCssDupliquee();
  chargerBootstrapCssUneFois();
  chargerFeuilleDeStyleUneFois(FONTAWESOME_CSS_URL);
  await chargerScriptUneFois(SPARK_MD5_URL, {
    isReady: () => Boolean(window.SparkMD5)
  });
}

export default async function senddingPage() {
  await assurerDependancesUi();
  await initialiserUI();
}

// === État global ===
window.sendding = {
  xhrGlobal: null
};

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isCinesVerificationActive() {
  return Boolean(window.sendding?.cinesPollToken && window.sendding.cinesPollToken.stopped === false);
}

function activerAvertissementNavigationPendantVerification() {
  const message = "Une vérification CINES est en cours. Quitter ou naviguer ailleurs interrompra l'affichage de l'état. Continuer ?";

  const beforeUnloadHandler = (e) => {
    if (!isCinesVerificationActive()) return;
    e.preventDefault();
    e.returnValue = message;
    return message;
  };

  const clickHandler = (e) => {
    if (!isCinesVerificationActive()) return;
    const link = e.target?.closest?.('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const ok = window.confirm(message);
    if (!ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  window.addEventListener('beforeunload', beforeUnloadHandler);
  document.addEventListener('click', clickHandler, true);

  return () => {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    document.removeEventListener('click', clickHandler, true);
  };
}

// === UI ===
async function initialiserUI() {
  let header = document.querySelector('header');
  if (!header) {
    header = document.createElement('header');
    document.body.prepend(header);
  }

  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.appendChild(main);
  }
  main.className = 'bg-body py-3 py-lg-4';
  main.innerHTML = '';

  try {
    const navbar = await import('../../components/navbar.js');
    await navbar.initNavbar('header');
  } catch {}

  let isAdmin = false;
  try {
    const { getCurrentUser } = await import('../../API/users/currentUser.js');
    const user = await getCurrentUser();
    isAdmin = user?.roleId === 1;
  } catch {}


  const container = document.createElement('div');
  container.className = 'container-xxl';

  const row = document.createElement('div');
  row.className = 'row justify-content-center';

  const col = document.createElement('div');
  col.className = 'col-12 col-md-10 col-lg-7 col-xl-6';

  const card = document.createElement('div');
  card.className = 'card shadow-sm';

  card.innerHTML = `
    <div class="card-header bg-body-tertiary">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <span class="fw-semibold">
          <i class="fa-solid fa-file-zipper me-2"></i>
          Envoi d’un paquet ZIP
        </span>
      </div>
    </div>

    <div class="card-body p-3 p-lg-4">
      <div class="mb-3">
        <label class="form-label fw-semibold">
          <i class="fa-solid fa-folder-open me-1 text-secondary"></i>
          Fichier ZIP
        </label>

        <div id="dropZone" class="border-2 border-dashed rounded p-4 text-center mb-2">
          <i class="fa-solid fa-cloud-upload-alt fa-3x text-secondary mb-2"></i>
          <p class="mb-2 fw-semibold">Glissez-déposez votre fichier ZIP ici</p>
          <p class="text-muted small mb-2">ou</p>
          <input type="file" id="inputFichier" class="form-control form-control-lg border-2 d-none" accept=".zip" ${!isAdmin ? 'disabled' : ''}>
          <button type="button" id="btnSelectFile" class="btn btn-outline-primary" ${!isAdmin ? 'disabled' : ''}>
            <i class="fa-solid fa-folder-open me-2"></i>Parcourir
          </button>
        </div>

        <div id="selectedFile" class="d-none alert alert-info py-2 px-3 d-flex align-items-center justify-content-between">
          <div>
            <i class="fa-solid fa-file-zipper me-2"></i>
            <span id="fileName" class="fw-semibold"></span>
            <span id="fileSize" class="text-muted small ms-2"></span>
          </div>
          <button type="button" id="btnClearFile" class="btn btn-sm btn-outline-danger" ${!isAdmin ? 'disabled' : ''}>
            <i class="fa-solid fa-times"></i>
          </button>
        </div>

        <div class="form-text">Format accepté : <span class="badge bg-secondary">.zip</span></div>
      </div>

      <button id="btnEnvoyer"
              class="btn btn-success btn-lg w-100 fw-semibold mb-3 d-flex justify-content-center align-items-center gap-2"
              ${!isAdmin ? 'disabled' : ''}>
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <span>Envoyer le fichier</span>
      </button>

      <div id="zoneStatus" class="alert d-none text-center mb-3"></div>
      <div id="etatUpload" class="alert d-none text-center" role="alert"></div>

      ${!isAdmin ? `
        <div class="alert alert-danger text-center small">
          <i class="fa-solid fa-triangle-exclamation me-1"></i>
          Accès réservé aux administrateurs
        </div>` : ''}

      <div id="progressContainer" class="mb-2 d-none">
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label small fw-semibold text-muted mb-0">
              <i class="fa-solid fa-hashtag me-1"></i>
              Calcul MD5 local
            </label>
            <span id="md5Status" class="badge bg-secondary">En attente...</span>
          </div>
          <div class="progress progress-sm">
            <div id="md5ProgressBar"
                 class="progress-bar bg-info"
                 role="progressbar"
                 style="width:0%;"
                 aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label small fw-semibold text-muted mb-0">
              <i class="fa-solid fa-cloud-upload-alt me-1"></i>
              Envoi du fichier
            </label>
            <span id="uploadStatus" class="badge bg-secondary">En attente...</span>
          </div>
          <div class="progress progress-sm">
            <div id="uploadProgressBar"
                 class="progress-bar bg-success"
                 role="progressbar"
                 style="width:0%;"
                 aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>
        
        <div class="d-flex justify-content-between align-items-center mt-3">
          <small id="progressTxt" class="text-muted"></small>
          <button id="btnCancelUpload" class="btn btn-sm btn-outline-danger">
            <i class="fa-solid fa-times me-1"></i>Annuler
          </button>
        </div>
        <input id="md5Local" type="hidden">
      </div>
    </div>

    <div class="card-footer bg-body-tertiary text-muted small">
      <i class="fa-solid fa-shield-halved me-1"></i>
      Vérification d’intégrité MD5
    </div>
  `;

  col.appendChild(card);
  row.appendChild(col);
  container.appendChild(row);
  main.appendChild(container);

  if (isAdmin) {
    configurerGestionFichier();
    document.getElementById('btnEnvoyer').onclick = gererEnvoi;
  }
}

// === Gestion des fichiers (drag & drop) ===
function configurerGestionFichier() {
  const dropZone = document.getElementById('dropZone');
  const inputFichier = document.getElementById('inputFichier');
  const btnSelectFile = document.getElementById('btnSelectFile');
  const btnClearFile = document.getElementById('btnClearFile');
  const selectedFile = document.getElementById('selectedFile');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');

  btnSelectFile.onclick = () => inputFichier.click();

  inputFichier.onchange = () => {
    if (inputFichier.files[0]) {
      afficherFichierSelectionne(inputFichier.files[0]);
    }
  };

  btnClearFile.onclick = () => {
    inputFichier.value = '';
    selectedFile.classList.add('d-none');
    dropZone.classList.remove('d-none');
    document.getElementById('btnEnvoyer').disabled = false;
  };

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drop-zone-hover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drop-zone-hover');
    });
  });

  dropZone.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        inputFichier.files = files;
        afficherFichierSelectionne(file);
      } else {
        afficherStatus('Veuillez déposer un fichier ZIP.', 'warning');
      }
    }
  });

  function afficherFichierSelectionne(file) {
    fileName.textContent = file.name;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    fileSize.textContent = `(${sizeMB} MB)`;
    dropZone.classList.add('d-none');
    selectedFile.classList.remove('d-none');
  }
}

// === Envoi (upload + CINES) ===
let uploadEnCours = false;

async function envoyerAuCinesImmediat(nomFichier) {
  const etat = document.getElementById('etatUpload');
  if (etat) {
    etat.className = 'alert alert-info text-center';
    etat.innerHTML = "<i class='fa-solid fa-cog fa-spin me-2'></i>Envoi au CINES…";
  }

  return callVitamAPI('envoi-immediat', {
    method: 'GET',
    headers: {
      'X-File-Name': nomFichier
    }
  });
}

async function programmerEnvoiCinesDiffere(nomFichier) {
  const etat = document.getElementById('etatUpload');
  if (etat) {
    etat.className = 'alert alert-info text-center';
    etat.innerHTML = "<i class='fa-solid fa-cog fa-spin me-2'></i>Mise en place de l’envoi différé…";
  }

  return callVitamAPI('programmation-differe', {
    method: 'GET',
    headers: {
      'X-File-Name': nomFichier
    }
  });
}

async function deplacerPaquetOK(nomFichier) {
  return callVitamAPI('deplacement-ok', {
    method: 'GET',
    headers: {
      'X-File-Name': nomFichier
    }
  });
}

async function deplacerPaquetKO(nomFichier) {
  return callVitamAPI('deplacement-ko', {
    method: 'GET',
    headers: {
      'X-File-Name': nomFichier
    }
  });
}

async function verifierStatutCines(
  itemid,
  {
    intervalMs = 5000,
    maxTries = Infinity,
    onTick = null,
    shouldStop = null
  } = {}
) {

  let lastData = null;
  for (let i = 0; i < maxTries; i++) {
    if (shouldStop?.()) {
      return { status: 'VERIFICATION_ARRETEE', message: "Vérification arrêtée." };
    }

    let data = null;
    try {
      data = await callVitamAPI('envoi-statut', {
        method: 'GET',
        headers: {
          'X-Item-Id': itemid
        }
      });
    } catch (e) {
      data = { status: 'STATUT_NON_DISPONIBLE', message: "Impossible de récupérer le statut." };
    }

    lastData = data;
    if (typeof onTick === 'function') {
      try {
        onTick(data, { attempt: i + 1, maxTries });
      } catch {}
    }

    // Arrêt dès que l'état n'est plus "ENVOI_EN_COURS"
    if (data?.status && data.status !== 'ENVOI_EN_COURS') {
      return data;
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }

  return {
    status: 'STATUT_NON_DISPONIBLE',
    message: "Délai dépassé pour la vérification d'état.",
    lastStatus: lastData?.status
  };
}

async function gererEnvoi() {
  const bouton = document.getElementById('btnEnvoyer');
  const input = document.getElementById('inputFichier');
  const fichier = input.files[0];
  const progressContainer = document.getElementById('progressContainer');

  if (!fichier) {
    afficherStatus('Veuillez sélectionner un fichier ZIP.', 'warning');
    return;
  }

  uploadEnCours = true;
  bouton.disabled = true;
  bouton.innerHTML = `
    <span class="spinner-border spinner-border-sm me-2"></span>
    <span>Traitement en cours…</span>
  `;

  let operationTerminee = false;
  let stopMd5 = false;

  const majSucces = () => {
    if (operationTerminee) {
      uploadEnCours = false;
      afficherStatus(`<i class="fa-solid fa-check-circle me-2"></i>Le fichier <strong>${escapeHtml(fichier.name)}</strong> a été envoyé avec succès sur le serveur.`, 'success');

      const etat = document.getElementById('etatUpload');
      if (etat) {
        etat.className = 'alert alert-light text-start';
        etat.innerHTML = `
          <div class='cines-panel'>
            <div class='cines-panel__header'>
              <div class='fw-semibold'>
                <i class='fa-solid fa-paper-plane me-2'></i>
                Transmission vers le CINES
              </div>
              <span class='badge text-bg-secondary'>À lancer</span>
            </div>

            <div class='small text-muted mt-1'>
              Choisissez le mode d’envoi pour le paquet <span class='fw-semibold'>${escapeHtml(fichier.name)}</span>.
            </div>

            <div id='cines' class='cines-panel__actions mt-3 d-flex gap-2 justify-content-center flex-wrap'>
              <button type='button' id='btnCinesImmediat' class='btn btn-success btn-sm px-4 fw-semibold'>
                <i class='fa-solid fa-bolt me-2'></i>Immédiat
              </button>
              <button type='button' id='btnCinesDiffere' class='btn btn-outline-secondary btn-sm px-4 fw-semibold'>
                <i class='fa-solid fa-clock me-2'></i>Différé
              </button>
            </div>

            <div id='cines_status' class='small text-muted mt-2' aria-live='polite'></div>
          </div>
        `;
      }

      const btnImmediat = document.getElementById('btnCinesImmediat');
      const btnDiffere = document.getElementById('btnCinesDiffere');
      const cinesStatus = document.getElementById('cines_status');

      const verrouillerChoix = (locked) => {
        if (btnImmediat) btnImmediat.disabled = locked;
        if (btnDiffere) btnDiffere.disabled = locked;
      };

      const nettoyerEtReset = () => {
        setTimeout(() => {
          const etat = document.getElementById('etatUpload');
          if (etat) {
            etat.textContent = '';
            etat.className = 'alert d-none text-center';
          }
          if (progressContainer) progressContainer.classList.add('d-none');
          reinitialiserFormulaire();
        }, 2000);
      };

      if (btnImmediat) {
        btnImmediat.onclick = async () => {
          verrouillerChoix(true);
          const cinesPollToken = { stopped: false };
          window.sendding.cinesPollToken = cinesPollToken;
          const cleanupNavigationWarning = activerAvertissementNavigationPendantVerification();

          const getUiStatus = (status) => {
            switch (status) {
              case 'ENVOI_OK':
                return { label: 'ENVOI OK', badgeClass: 'text-bg-success', iconHtml: "<i class='fa-solid fa-circle-check me-1'></i>" };
              case 'ENVOI_EN_ERREUR':
                return { label: 'EN ERREUR', badgeClass: 'text-bg-danger', iconHtml: "<i class='fa-solid fa-triangle-exclamation me-1'></i>" };
              case 'ENVOI_EN_COURS':
                return { label: 'EN COURS', badgeClass: 'text-bg-info', iconHtml: "<i class='fa-solid fa-spinner fa-spin me-1'></i>" };
              case 'STATUT_NON_DISPONIBLE':
                return { label: 'STATUT INDISPONIBLE', badgeClass: 'text-bg-warning', iconHtml: "<i class='fa-solid fa-triangle-exclamation me-1'></i>" };
              default:
                return { label: status ? String(status) : 'INCONNU', badgeClass: 'text-bg-secondary', iconHtml: "<i class='fa-solid fa-circle-info me-1'></i>" };
            }
          };

          try {
            await mettreAJourStatutPaquet(fichier.name, 4);
            const resultat = await envoyerAuCinesImmediat(fichier.name);
            if (resultat?.status === 'success' && resultat?.itemid) {
              try {
                const { createHistoriqueEnvoi } = await import('../../API/paquet/historiqueEnvoi.js');
                const cote = fichier.name.endsWith('.zip') ? fichier.name.slice(0, -4) : fichier.name;
                const paquetCote = cote.toUpperCase().startsWith('SIP_') ? cote.slice(4) : cote;
                await createHistoriqueEnvoi({ itemsId: resultat.itemid, paquetCote });
              } catch (e) {
                console.warn("Impossible d'enregistrer l'historique d'envoi", e);
              }

              const etat = document.getElementById('etatUpload');
              if (etat) {
                const ui = getUiStatus('ENVOI_EN_COURS');
                etat.className = 'alert alert-info text-start';
                etat.innerHTML = `
                  <div class='cines-panel'>
                    <div class='cines-panel__header'>
                      <div class='fw-semibold'>
                        <i class='fa-solid fa-paper-plane me-2'></i>
                        Envoi au CINES
                      </div>
                      <span id='cines_status_badge' class='badge ${ui.badgeClass}'>${ui.iconHtml}${ui.label}</span>
                    </div>

                    <div class='small mt-2'>
                      <div class='d-flex flex-wrap gap-3 align-items-center'>
                        <span><i class='fa-solid fa-file-zipper me-1'></i><span class='text-muted'>Fichier :</span> <span class='fw-semibold'>${escapeHtml(fichier.name)}</span></span>
                        <span><i class='fa-solid fa-hashtag me-1'></i><span class='text-muted'>ItemId :</span> <code class='cines-code'>${escapeHtml(resultat.itemid)}</code></span>
                      </div>

                      ${resultat?.message ? `
                        <div class='mt-2'>
                          <span class='text-muted'>Message :</span>
                          <span id='cines_server_message'>${escapeHtml(resultat.message)}</span>
                        </div>
                      ` : ''}
                    </div>

                    <div class='cines-panel__meta small mt-3'>
                      <div class='d-flex flex-wrap gap-3'>
                        <span class='cines-meta-item'>
                          <i class='fa-solid fa-clock me-1'></i>
                          <span class='text-muted'>Dernière vérification :</span>
                          <span id='cines_last_check'>—</span>
                        </span>
                        <span class='cines-meta-item'>
                          <i class='fa-solid fa-rotate me-1'></i>
                          <span class='text-muted'>Vérification :</span>
                          <span id='cines_attempt'>0</span>/<span id='cines_max'>∞</span>
                          <span class='text-muted'>(toutes les 5 s)</span>
                        </span>
                      </div>

                      <div id='cines_polling_message' class='text-muted mt-1'></div>
                      <div class='text-muted mt-1'>
                        <i class='fa-solid fa-circle-info me-1'></i>
                        Gardez cette page ouverte pendant la vérification.
                      </div>
                    </div>
                  </div>
                `;
              }

              const statut = await verifierStatutCines(resultat.itemid, {
                intervalMs: 5000,
                shouldStop: () => {
                  const etatEl = document.getElementById('etatUpload');
                  return cinesPollToken.stopped || !etatEl;
                },
                onTick: (data, meta) => {
                  const badgeEl = document.getElementById('cines_status_badge');
                  const lastCheckEl = document.getElementById('cines_last_check');
                  const attemptEl = document.getElementById('cines_attempt');
                  const maxEl = document.getElementById('cines_max');
                  const msgEl = document.getElementById('cines_polling_message');

                  if (attemptEl) attemptEl.textContent = String(meta.attempt);
                  if (maxEl) {
                    maxEl.textContent = meta.maxTries === Infinity ? '∞' : String(meta.maxTries);
                  }
                  if (lastCheckEl) lastCheckEl.textContent = new Date().toLocaleTimeString();

                  const ui = getUiStatus(data?.status);
                  if (badgeEl) {
                    badgeEl.className = `badge ${ui.badgeClass}`;
                    badgeEl.innerHTML = `${ui.iconHtml}${ui.label}`;
                  }

                  if (msgEl) {
                    msgEl.textContent = data?.message ? String(data.message) : '';
                  }
                }
              });
              const etatFinal = document.getElementById('etatUpload');
              if (etatFinal) {
                if (statut?.status === 'ENVOI_OK') {
                  // Règle demandée : si non validé CINES => ERREUR, sinon ENVOI_OK.
                  // La validation est vérifiée via le bordereau (ReplyCode === 'OK').
                  let validatedByCines = false;
                  try {
                    const bordereau = await callVitamAPI('bordereau', {
                      method: 'GET',
                      headers: {
                        'X-Item-Id': resultat.itemid
                      }
                    });
                    validatedByCines = bordereau?.status === 'success' && bordereau?.info?.ReplyCode === 'OK';
                  } catch {
                    validatedByCines = false;
                  }

                  if (validatedByCines) {
                    await mettreAJourStatutPaquet(fichier.name, 3);

                    try {
                      await deplacerPaquetOK(fichier.name);
                    } catch (e) {
                      console.warn('Déplacement (OK) non effectué', e);
                    }

                    etatFinal.className = 'alert alert-success text-start';
                    etatFinal.innerHTML = `
                      <div class='cines-panel'>
                        <div class='cines-panel__header'>
                          <div class='fw-semibold'><i class='fa-solid fa-circle-check me-2'></i>Validation CINES</div>
                          <span class='badge text-bg-success'><i class='fa-solid fa-check me-1'></i>OK</span>
                        </div>
                        <div class='small mt-2'>Paquet validé par le CINES (bordereau : <span class='fw-semibold'>OK</span>).</div>
                      </div>
                    `;
                  } else {
                    await mettreAJourStatutPaquet(fichier.name, 5);

                    // Même si le statut CINES est ENVOI_OK, si le bordereau n'est pas OK
                    // on considère l'envoi en erreur et on déplace dans le répertoire KO.
                    try {
                      await deplacerPaquetKO(fichier.name);
                    } catch (e) {
                      console.warn('Déplacement (KO) non effectué', e);
                    }

                    etatFinal.className = 'alert alert-danger text-start';
                    etatFinal.innerHTML = `
                      <div class='cines-panel'>
                        <div class='cines-panel__header'>
                          <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Validation CINES</div>
                          <span class='badge text-bg-danger'><i class='fa-solid fa-xmark me-1'></i>KO</span>
                        </div>
                        <div class='small mt-2'>Bordereau non OK : statut mis en erreur et déplacement en répertoire KO.</div>
                      </div>
                    `;
                  }
                } else if (statut?.status === 'STATUT_NON_DISPONIBLE') {
                  etatFinal.className = 'alert alert-warning text-start';
                  etatFinal.innerHTML = `
                    <div class='cines-panel'>
                      <div class='cines-panel__header'>
                        <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Statut CINES indisponible</div>
                        <span class='badge text-bg-warning'><i class='fa-solid fa-triangle-exclamation me-1'></i>À vérifier</span>
                      </div>
                      <div class='small mt-2'>
                        Statut : <span class='fw-semibold'>${escapeHtml(statut?.status ?? 'inconnu')}</span>${statut?.message ? ` — ${escapeHtml(statut.message)}` : ''}
                      </div>
                    </div>
                  `;
                } else if (statut?.status === 'ENVOI_EN_ERREUR') {
                  await mettreAJourStatutPaquet(fichier.name, 5);

                  try {
                    await deplacerPaquetKO(fichier.name);
                  } catch (e) {
                    console.warn('Déplacement (KO) non effectué', e);
                  }

                  etatFinal.className = 'alert alert-danger text-start';
                  etatFinal.innerHTML = `
                    <div class='cines-panel'>
                      <div class='cines-panel__header'>
                        <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Envoi CINES en erreur</div>
                        <span class='badge text-bg-danger'><i class='fa-solid fa-xmark me-1'></i>Erreur</span>
                      </div>
                      <div class='small mt-2'>${statut?.message ? escapeHtml(statut.message) : 'Le CINES a retourné un statut en erreur.'}</div>
                    </div>
                  `;
                } else if (statut?.status === 'VERIFICATION_ARRETEE') {
                  etatFinal.className = 'alert alert-warning text-start';
                  etatFinal.innerHTML = `
                    <div class='cines-panel'>
                      <div class='cines-panel__header'>
                        <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Vérification interrompue</div>
                        <span class='badge text-bg-warning'><i class='fa-solid fa-pause me-1'></i>Arrêt</span>
                      </div>
                      <div class='small mt-2'>${escapeHtml(statut?.message ?? 'Vérification arrêtée.')}</div>
                    </div>
                  `;
                } else {
                  await mettreAJourStatutPaquet(fichier.name, 5);
                  etatFinal.className = 'alert alert-warning text-start';
                  etatFinal.innerHTML = `
                    <div class='cines-panel'>
                      <div class='cines-panel__header'>
                        <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Statut CINES</div>
                        <span class='badge text-bg-warning'><i class='fa-solid fa-triangle-exclamation me-1'></i>À vérifier</span>
                      </div>
                      <div class='small mt-2'>
                        Statut : <span class='fw-semibold'>${escapeHtml(statut?.status ?? 'inconnu')}</span>${statut?.message ? ` — ${escapeHtml(statut.message)}` : ''}
                      </div>
                    </div>
                  `;
                }
              }
            } else {
              await mettreAJourStatutPaquet(fichier.name, 5);
              const etat = document.getElementById('etatUpload');
              if (etat) {
                etat.className = 'alert alert-danger text-start';
                const msg = escapeHtml(resultat?.message ?? "Erreur lors de l'envoi au CINES.");
                const out = resultat?.output ? escapeHtml(resultat.output) : '';
                etat.innerHTML = `
                  <div class='cines-panel'>
                    <div class='cines-panel__header'>
                      <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Envoi CINES</div>
                      <span class='badge text-bg-danger'><i class='fa-solid fa-xmark me-1'></i>Erreur</span>
                    </div>
                    <div class='small mt-2'>${msg}</div>
                    ${out ? `<pre class='cines-pre small mt-2 mb-0'>${out}</pre>` : ''}
                  </div>
                `;
              }
            }
          } catch (e) {
            await mettreAJourStatutPaquet(fichier.name, 5);
            const etat = document.getElementById('etatUpload');
            if (etat) {
              etat.className = 'alert alert-danger text-start';
              etat.innerHTML = `
                <div class='cines-panel'>
                  <div class='cines-panel__header'>
                    <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Envoi immédiat au CINES</div>
                    <span class='badge text-bg-danger'><i class='fa-solid fa-xmark me-1'></i>Erreur</span>
                  </div>
                  <div class='small mt-2'>Une erreur est survenue pendant l’envoi immédiat.</div>
                </div>
              `;
            }
          } finally {
            if (window.sendding?.cinesPollToken) {
              window.sendding.cinesPollToken.stopped = true;
            }
            try {
              cleanupNavigationWarning?.();
            } catch {}
            nettoyerEtReset();
          }
        };
      }

      if (btnDiffere) {
        btnDiffere.onclick = async () => {
          verrouillerChoix(true);
          if (cinesStatus) cinesStatus.innerHTML = "<i class='fa-solid fa-cog fa-spin me-2'></i>Programmation du différé…";
          try {
            await mettreAJourStatutPaquet(fichier.name, 8);
            const resultat = await programmerEnvoiCinesDiffere(fichier.name);
            const etat = document.getElementById('etatUpload');
            if (resultat?.status === 'success') {
              if (resultat?.itemid) {
                try {
                  const { createHistoriqueEnvoi } = await import('../../API/paquet/historiqueEnvoi.js');
                  const cote = fichier.name.endsWith('.zip') ? fichier.name.slice(0, -4) : fichier.name;
                  const paquetCote = cote.toUpperCase().startsWith('SIP_') ? cote.slice(4) : cote;
                  await createHistoriqueEnvoi({ itemsId: resultat.itemid, paquetCote });
                } catch (e) {
                  console.warn("Impossible d'enregistrer l'historique d'envoi", e);
                }
              }

              if (etat) {
                etat.className = 'alert alert-success text-start';
                etat.innerHTML = `
                  <div class='cines-panel'>
                    <div class='cines-panel__header'>
                      <div class='fw-semibold'><i class='fa-solid fa-check me-2'></i>Envoi différé</div>
                      <span class='badge text-bg-success'><i class='fa-solid fa-check me-1'></i>Programmé</span>
                    </div>
                    <div class='small mt-2'>La programmation de l’envoi différé est en place.</div>
                  </div>
                `;
              }
            } else {
              await mettreAJourStatutPaquet(fichier.name, 5);
              if (etat) {
                etat.className = 'alert alert-warning text-start';
                const err = resultat?.error ? escapeHtml(resultat.error) : '';
                etat.innerHTML = `
                  <div class='cines-panel'>
                    <div class='cines-panel__header'>
                      <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Envoi différé</div>
                      <span class='badge text-bg-warning'><i class='fa-solid fa-triangle-exclamation me-1'></i>Non programmé</span>
                    </div>
                    <div class='small mt-2'>Impossible de mettre en place l’envoi différé.</div>
                    ${err ? `<div class='small mt-1 text-muted'>${err}</div>` : ''}
                  </div>
                `;
              }
            }
          } catch (e) {
            await mettreAJourStatutPaquet(fichier.name, 5);
            const etat = document.getElementById('etatUpload');
            if (etat) {
              etat.className = 'alert alert-danger text-start';
              etat.innerHTML = `
                <div class='cines-panel'>
                  <div class='cines-panel__header'>
                    <div class='fw-semibold'><i class='fa-solid fa-triangle-exclamation me-2'></i>Envoi différé</div>
                    <span class='badge text-bg-danger'><i class='fa-solid fa-xmark me-1'></i>Erreur</span>
                  </div>
                  <div class='small mt-2'>Erreur lors de la programmation du différé.</div>
                </div>
              `;
            }
          } finally {
            nettoyerEtReset();
          }
        };
      }
    }
  };

  try {
    if (progressContainer) progressContainer.classList.remove('d-none');
    const cote = fichier.name.endsWith('.zip') ? fichier.name.slice(0, -4) : fichier.name;
    let coteSansPrefix = cote.toUpperCase().startsWith('SIP_') ? cote.slice(4) : cote;
    const modulePaquet = await import('../../API/paquet/paquet.js');
    if (!modulePaquet?.fetchOnePaquet) {
      afficherStatus('Erreur interne : fetchOnePaquet non disponible.', 'danger');
      bouton.disabled = false;
      bouton.innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <span>Envoyer le fichier</span>
      `;
      return;
    }
    const result = await modulePaquet.fetchOnePaquet(coteSansPrefix);
    if (!result || !result.success || !result.data) {
      const { afficherCardPaquetAddModal } = await import('../../components/editPaquet/addPaquet.js');
      document.getElementById('paquet-modal-overlay-upload')?.remove();
      const overlay = document.createElement('div');
      overlay.id = 'paquet-modal-overlay-upload';
      overlay.className = 'modal fade show';
      overlay.style.display = 'block';
      overlay.style.background = 'rgba(0,0,0,0.5)';
      overlay.style.position = 'fixed';
      overlay.style.top = 0;
      overlay.style.left = 0;
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.zIndex = 3000;

      const modal = document.createElement('div');
      modal.className = 'modal-dialog modal-dialog-centered';

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content shadow-lg';

      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      const title = document.createElement('h5');
      title.className = 'modal-title fw-bold text-center w-100';
      title.textContent = 'Créer le paquet ?';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'btn-close';
      closeBtn.setAttribute('aria-label', 'Fermer');
      closeBtn.onclick = () => overlay.remove();
      modalHeader.appendChild(title);
      modalHeader.appendChild(closeBtn);

      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body text-center';
      modalBody.innerHTML = `<p>Le paquet <strong>${coteSansPrefix}</strong> n'existe pas.<br>Voulez-vous le créer maintenant ?</p>`;

      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer d-flex justify-content-center gap-3';
      const btnCreer = document.createElement('button');
      btnCreer.className = 'btn btn-success';
      btnCreer.textContent = 'Créer le paquet';
      btnCreer.onclick = () => {
        overlay.remove();
        const defaultName = coteSansPrefix;
        afficherCardPaquetAddModal({
          folderName: defaultName,
          cote: defaultName
        });
      };
      const btnAnnuler = document.createElement('button');
      btnAnnuler.className = 'btn btn-outline-secondary';
      btnAnnuler.textContent = 'Annuler';
      btnAnnuler.onclick = () => {
        overlay.remove();
        afficherStatus('Envoi annulé. Le paquet doit être créé avant l’envoi.', 'warning');
      };
      modalFooter.appendChild(btnCreer);
      modalFooter.appendChild(btnAnnuler);

      modalContent.appendChild(modalHeader);
      modalContent.appendChild(modalBody);
      modalContent.appendChild(modalFooter);
      modal.appendChild(modalContent);
      overlay.appendChild(modal);
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove();
      });
      document.body.appendChild(overlay);
      bouton.disabled = false;
      bouton.innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <span>Envoyer le fichier</span>
      `;
      return;
    }
    const md5ProgressBar = document.getElementById('md5ProgressBar');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const md5Status = document.getElementById('md5Status');
    const uploadStatus = document.getElementById('uploadStatus');
    const btnCancelUpload = document.getElementById('btnCancelUpload');
    const md5Local = document.getElementById('md5Local');

    let md5Pourcentage = 0;
    let uploadPourcentage = 0;
    let md5Termine = false;
    let uploadTermine = false;
    let erreur = false;

    btnCancelUpload.onclick = () => {
      if (window.sendding.xhrGlobal) {
        window.sendding.xhrGlobal.abort();
      }
      stopMd5 = true;
      uploadEnCours = false;
      if (progressContainer) progressContainer.classList.add('d-none');
      afficherStatus('Envoi annulé par l\'utilisateur.', 'warning');
      reinitialiserFormulaire();
    };

    function updateProgressBar() {
      md5ProgressBar.style.width = md5Pourcentage + '%';
      md5ProgressBar.setAttribute('aria-valuenow', md5Pourcentage);
      
      uploadProgressBar.style.width = uploadPourcentage + '%';
      uploadProgressBar.setAttribute('aria-valuenow', uploadPourcentage);
      
      if (md5Pourcentage === 100) {
        md5Status.textContent = 'Terminé';
        md5Status.className = 'badge bg-success';
        md5ProgressBar.classList.remove('uploading-animation');
      } else if (md5Pourcentage > 0) {
        md5Status.textContent = md5Pourcentage + '%';
        md5Status.className = 'badge bg-info';
        md5ProgressBar.classList.add('uploading-animation');
      }
      
      if (uploadPourcentage === 100) {
        uploadStatus.textContent = 'Terminé';
        uploadStatus.className = 'badge bg-success';
        uploadProgressBar.classList.remove('uploading-animation');
      } else if (uploadPourcentage > 0) {
        uploadStatus.textContent = uploadPourcentage + '%';
        uploadStatus.className = 'badge bg-primary';
        uploadProgressBar.classList.add('uploading-animation');
      }
    }
    
    const inputFichier = document.getElementById('inputFichier');
    const fichierAEnvoyer = inputFichier.files[0];
    const tailleMorceau = 2 * 1024 * 1024;
    const nombreMorceaux = Math.ceil(fichierAEnvoyer.size / tailleMorceau);
    let morceauActuel = 0;
    const calculateurMD5 = new window.SparkMD5.ArrayBuffer();
    const lecteur = new FileReader();

    md5Status.textContent = 'En cours...';
    md5Status.className = 'badge bg-info';
    uploadStatus.textContent = 'En cours...';
    uploadStatus.className = 'badge bg-primary';

    function calculerMD5EnParallele() {
      if (stopMd5) return;
      if (morceauActuel >= nombreMorceaux) {
        md5Termine = true;
        md5Pourcentage = 100;
        const hash = calculateurMD5.end();
        if (md5Local) md5Local.value = hash;
        try {
          window.dispatchEvent(new CustomEvent('md5local:ready', {
            detail: { md5: hash, fileName: fichierAEnvoyer?.name }
          }));
        } catch {}
        updateProgressBar();
        if (uploadTermine) {
          operationTerminee = true;
          progressContainer.classList.add('d-none');
          majSucces();
        }
        return;
      }
      const debut = morceauActuel * tailleMorceau;
      const fin = Math.min(debut + tailleMorceau, fichierAEnvoyer.size);
      lecteur.onload = e => {
        if (stopMd5) return;
        calculateurMD5.append(e.target.result);
        morceauActuel++;
        md5Pourcentage = Math.ceil(morceauActuel * 100 / nombreMorceaux);
        updateProgressBar();
        calculerMD5EnParallele();
      };
      lecteur.readAsArrayBuffer(fichierAEnvoyer.slice(debut, fin));
    }

    const importerCardConfirm = () => import('../../components/download/cardConfirm.js');
    envoyerFichier(
      importerCardConfirm,
      envoyerFichierAvecRemplacement,
      mettreAJourStatutPaquet,
      (pct) => {
        uploadPourcentage = pct;
        if (pct === 100) {
          uploadTermine = true;
          if (md5Termine) {
            operationTerminee = true;
            progressContainer.classList.add('d-none');
            majSucces();
          }
        }
        updateProgressBar();
      }
    ).catch((e) => {
      erreur = true;
      stopMd5 = true;
      uploadEnCours = false;
      uploadPourcentage = 0;
      updateProgressBar();
      if (progressContainer) progressContainer.classList.add('d-none');
      if (e?.message !== 'Envoi annulé') {
        afficherStatus("<i class='fa-solid fa-exclamation-triangle me-2'></i>Échec de l'envoi.", 'danger');
      }
      reinitialiserFormulaire();
    });

    calculerMD5EnParallele();

  } catch (e) {
    stopMd5 = true;
    uploadEnCours = false;
    afficherStatus('<i class="fa-solid fa-exclamation-triangle me-2"></i>Erreur lors de l\'envoi du fichier.', 'danger');
    if (progressContainer) progressContainer.classList.add('d-none');
    reinitialiserFormulaire();
  } finally {
    if (!uploadEnCours) {
      bouton.disabled = false;
      bouton.innerHTML = `
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <span>Envoyer le fichier</span>
      `;
    }
  }
}

// === Réinitialisation ===
function reinitialiserFormulaire() {
  const bouton = document.getElementById('btnEnvoyer');
  const input = document.getElementById('inputFichier');
  const selectedFile = document.getElementById('selectedFile');
  const dropZone = document.getElementById('dropZone');
  const md5Local = document.getElementById('md5Local');
  const md5ProgressBar = document.getElementById('md5ProgressBar');
  const uploadProgressBar = document.getElementById('uploadProgressBar');
  const md5Status = document.getElementById('md5Status');
  const uploadStatus = document.getElementById('uploadStatus');
  
  bouton.disabled = false;
  bouton.innerHTML = `
    <i class="fa-solid fa-cloud-arrow-up"></i>
    <span>Envoyer le fichier</span>
  `;
  
  if (input) input.value = '';
  if (md5Local) md5Local.value = '';
  if (selectedFile) selectedFile.classList.add('d-none');
  if (dropZone) dropZone.classList.remove('d-none');
  
  if (md5ProgressBar) {
    md5ProgressBar.style.width = '0%';
    md5ProgressBar.setAttribute('aria-valuenow', 0);
  }
  if (uploadProgressBar) {
    uploadProgressBar.style.width = '0%';
    uploadProgressBar.setAttribute('aria-valuenow', 0);
  }
  if (md5Status) {
    md5Status.textContent = 'En attente...';
    md5Status.className = 'badge bg-secondary';
  }
  if (uploadStatus) {
    uploadStatus.textContent = 'En attente...';
    uploadStatus.className = 'badge bg-secondary';
  }
}

