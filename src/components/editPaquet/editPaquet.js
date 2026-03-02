import { selectCorpus } from '../selecteur/selectCorpus.js';
import { createTypeDocumentSelector } from '../selecteur/selectTypeDocument.js';
import { createStatusSelector } from '../selecteur/selectStatus.js';
import { editPaquet } from '../../API/paquet/paquet.js';
import { openPaquetModal, applySipRule, refreshPaquetTables } from './paquetModalShared.js';

function isFlagTruthy(value) {
	if (value === true) return true;
	if (value === false || value === 0 || value === null || value === undefined) return false;
	if (typeof value === 'number') return value !== 0;
	const v = String(value).trim().toLowerCase();
	if (!v) return false;
	const asNumber = Number(v);
	if (!Number.isNaN(asNumber)) return asNumber !== 0;
	return v === 'true' || v === 'oui' || v === 'yes';
}

export function afficherCardPaquetEditModal(paquet) {
	openPaquetModal({
		titleText: 'Modification',
		values: {
			folderName: paquet?.folderName ?? '',
			microFilmImage: paquet?.microFilmImage ?? '',
			cote: paquet?.cote ?? '',
			oldCote: paquet?.cote ?? '',
			imageColor: paquet?.imageColor ?? '',
			searchArchiving: paquet?.searchArchiving ?? '',
			comment: paquet?.commentaire ?? '',
			toDo: isFlagTruthy(paquet?.toDo),
			facileTest: isFlagTruthy(paquet?.facileTest),
			filedSip: isFlagTruthy(paquet?.filedSip),
			includeOldCote: true,
		},
		afterMount: async ({ form }) => {
			const corpusContainer = form.querySelector('#corpus-select-container');
		if (corpusContainer) {
			const corpusSelector = selectCorpus(undefined, paquet.corpusId);
			corpusContainer.appendChild(corpusSelector);
		}
		const typeDocContainer = form.querySelector('#type-document-select-container');
		if (typeDocContainer) {
			const typeDocSelectorWrapper = await createTypeDocumentSelector({ name: 'typeDocumentId', value: paquet.typeDocumentId || paquet.typeDocument_id || '' });
			typeDocContainer.appendChild(typeDocSelectorWrapper);
		}
		const statusContainer = form.querySelector('#status-select-container');
		if (statusContainer) {
			const statusSelectorWrapper = await createStatusSelector({
				name: 'statusId',
				value: paquet.statusId || paquet.status_id || '',
				allowedLabels: ['INEXISTANT', 'NON_ENVOYE'],
			});
			statusContainer.appendChild(statusSelectorWrapper);

			const sipCheckbox = form.querySelector('[name="filedSip"]');
			if (sipCheckbox) {
				sipCheckbox.addEventListener('change', () => applySipRule(form));
			}
			applySipRule(form);
		}
		},
		onSubmit: async (data, { destroy, showPopup }) => {
			if (!data.oldCote && paquet?.cote) {
				data.oldCote = paquet.cote;
			}
			let res = null;
			try {
				res = await editPaquet(data);
			} catch (e) {
				res = null;
			}
			destroy();
			if (res && (res.success || res.status === 'success')) {
				showPopup('Le paquet a bien été modifié.', true);
				await refreshPaquetTables();
			} else if (res && res.fields) {
				showPopup('Champs manquants : ' + res.fields.join(', '), false);
			} else if (res && res.message) {
				showPopup(res.message, false);
			} else {
				showPopup("Erreur lors de la modification du paquet.", false);
			}
		},
	});
}
