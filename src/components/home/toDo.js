
import { fetchAllPaquets } from '../../API/paquet/paquet.js';
import { afficherCardPaquetModal } from './cardPaquet.js';
import { isFlagTruthy, renderMiniPaquetList } from './miniPaquetList.js';

// Affiche le tableau des paquets à faire 
export async function afficherTableauToDoPaquet(conteneurId = 'to-do-paquet-conteneur') {
	return renderMiniPaquetList(conteneurId, {
		renderKey: 'toDoRenderId',
		fetchPaquets: fetchAllPaquets,
		filtre: (paquet) => isFlagTruthy(paquet?.toDo),
		htmlVide: '<div class="text-muted text-center">Aucun paquet à faire.</div>',
		classeCarte: 'card shadow-sm paquet-mini-item paquet-mini-item--todo w-100 paquet-mini-card px-3 py-2 text-start',
		renderItem: (paquet) => {
			const raw = paquet?.lastmodifDate || paquet?.date || null;
			let subtitle = '';
			if (raw) {
				const d = new Date(raw);
				if (!Number.isNaN(d.getTime())) {
					subtitle = d.toLocaleDateString('fr-FR', { dateStyle: 'short' });
				}
			}
			return { title: paquet?.cote || '', subtitle };
		},
		ouvrirPaquet: (paquet) => afficherCardPaquetModal(paquet),
		parPage: 4
	});
}

window.afficherTableauToDoPaquet = afficherTableauToDoPaquet;
