/**
 * VillaNova · event-detail.js
 * ============================================================================
 * Point d'entrée de la fiche événement détaillée.
 *
 * Workflow :
 *  1. Lecture du paramètre ?id=... dans l'URL via URLSearchParams
 *  2. Fetch des détails complets de l'événement
 *  3. Hydratation du HTML existant avec les données réelles
 *  4. Chargement parallèle de 3 événements similaires (à la une de l'aside)
 *  5. Gestion accessible des erreurs (id manquant, événement inexistant…)
 * ============================================================================
 */

import { fetchEventById, fetchEvents } from './api.js';
import {
  formatDate,
  formatBadgeDate,
  createEventCard,
  createErrorState,
  el,
  clearChildren,
  replaceContent,
} from './ui.js';
import {
  announce,
  announceUrgent,
  moveFocusTo,
  setBusy,
  humanizeError,
} from './a11y.js';


// ----------------------------------------------------------------------------
// LECTURE DE L'ID DEPUIS L'URL
// ----------------------------------------------------------------------------

/**
 * Récupère l'UID de l'événement depuis ?id=... dans l'URL.
 * @returns {string|null}
 */
function getEventIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}


// ----------------------------------------------------------------------------
// HYDRATATION DU HTML EXISTANT
// ----------------------------------------------------------------------------

/**
 * Met à jour le DOM existant avec les données de l'événement.
 * On ne reconstruit PAS la page, on hydrate les zones (le HTML statique
 * sert de squelette accessible).
 *
 * @param {Object} event - Événement normalisé
 */
function hydrateEvent(event) {
  // Document title
  document.title = `${event.title} — VillaNova`;

  // Meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && event.description) {
    metaDesc.setAttribute('content', event.description.slice(0, 160));
  }

  // Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', event.title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && event.description) ogDesc.setAttribute('content', event.description);
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && event.imageUrl) ogImage.setAttribute('content', event.imageUrl);

  // Fil d'Ariane (dernier élément = nom de l'événement)
  const breadcrumbCurrent = document.querySelector('nav[aria-label*="Ariane"] li:last-child [itemprop="name"]');
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = event.title;

  // === HEADER de l'article ===

  const article = document.querySelector('main > article');
  if (!article) return;

  // Titre h1
  const h1 = article.querySelector('h1');
  if (h1) h1.textContent = event.title;

  // Image hero
  const heroImg = article.querySelector('header picture img');
  if (heroImg && event.imageUrl) {
    heroImg.src = event.imageUrl;
    heroImg.alt = event.imageAlt || event.title;
    // Retirer les <source> existants si l'image API n'a qu'un format
    const sources = article.querySelectorAll('header picture source');
    sources.forEach(s => s.remove());
  }

  // Tags (premier = catégorie déduite, deuxième = éco si keyword "éco", troisième = public)
  const tags = article.querySelectorAll('header > p:nth-child(2) small > span');
  if (tags.length >= 1 && event.keywords[0]) {
    tags[0].textContent = event.keywords[0];
  }

  // === INFORMATIONS PRATIQUES (dl) ===

  const dl = article.querySelector('section[aria-labelledby="titre-infos"] dl');
  if (dl) {
    const dds = dl.querySelectorAll('dd');

    // dd[0] : Dates
    if (dds[0] && event.startDate) {
      clearChildren(dds[0]);
      const startStr = formatDate(event.startDate, { withTime: true });
      const endStr = event.endDate && event.endDate !== event.startDate
        ? formatDate(event.endDate, { withTime: true })
        : null;

      dds[0].appendChild(document.createTextNode(endStr ? 'Du ' : 'Le '));
      dds[0].appendChild(el('time', { datetime: event.startDate, itemprop: 'startDate' }, [startStr]));
      if (endStr) {
        dds[0].appendChild(document.createTextNode(' au '));
        dds[0].appendChild(el('time', { datetime: event.endDate, itemprop: 'endDate' }, [endStr]));
      }
    }

    // dd[1] : Horaires (déduit du timing)
    if (dds[1] && event.timings.length > 0) {
      const startTime = event.timings[0].begin;
      const endTime = event.timings[0].end;
      if (startTime && endTime) {
        try {
          const start = new Date(startTime);
          const end = new Date(endTime);
          const fmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
          dds[1].textContent = `${fmt.format(start)} — ${fmt.format(end)}`;
        } catch {
          dds[1].textContent = '';
        }
      }
    }

    // dd[2] : Lieu
    if (dds[2]) {
      clearChildren(dds[2]);
      const locName = event.locationName || 'Lieu à préciser';
      const locStrong = document.createElement('strong');
      locStrong.textContent = locName;
      dds[2].appendChild(locStrong);
      if (event.locationAddress || event.locationCity) {
        dds[2].appendChild(document.createElement('br'));
        const addr = [event.locationAddress, event.locationCity].filter(Boolean).join(', ');
        dds[2].appendChild(document.createTextNode(addr));
      }
    }

    // dd[3] : Tarif
    if (dds[3]) {
      clearChildren(dds[3]);
      dds[3].textContent = event.isFree ? 'Gratuit' : (event.conditions || 'Voir détails sur place');
    }
  }

  // === DESCRIPTION ===

  const descSection = article.querySelector('section[aria-labelledby="titre-description"]');
  if (descSection) {
    // On garde le h2 et on remplace les paragraphes
    const h2 = descSection.querySelector('h2');
    clearChildren(descSection);
    descSection.appendChild(h2);

    // Lead = description courte
    if (event.description) {
      const lead = el('p', { class: 'lead' }, [event.description]);
      descSection.appendChild(lead);
    }

    // Description longue (si différente de la courte)
    if (event.longDescription && event.longDescription !== event.description) {
      // ATTENTION : longDescription peut contenir du HTML.
      // Sécurisation : on parse via DOMParser et on extrait le textContent.
      // Pour préserver les paragraphes, on split sur les <br> et balises bloc.
      const cleaned = event.longDescription
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, '');  // Strip toutes les autres balises

      cleaned.split(/\n\n+/).forEach(para => {
        const trimmed = para.trim();
        if (trimmed) {
          descSection.appendChild(el('p', {}, [trimmed]));
        }
      });
    }
  }

  // === CACHER LES SECTIONS NON RENSEIGNÉES PAR L'API ===

  // La section "Programme" et la vidéo sont des démos statiques.
  // Si l'API ne fournit pas ces données, on les cache.
  // (La section "Réservation" reste visible car elle est branchée
  //  sur le module REST POST/PATCH/DELETE — voir initReservationFlow)
  const sectionsToHide = [
    'section[aria-labelledby="titre-video"]',
    'section[aria-labelledby="titre-programme"]',
  ];
  sectionsToHide.forEach(sel => {
    const section = article.querySelector(sel);
    if (section) section.style.display = 'none';
  });

  // === LIEN DE PARTAGE (mailto/linkedin) — mettre à jour avec le titre réel ===

  const shareLinks = article.querySelectorAll('section[aria-labelledby="titre-partage"] a');
  shareLinks.forEach(link => {
    if (link.href.startsWith('mailto:')) {
      const subject = encodeURIComponent(event.title);
      const body = encodeURIComponent(`Je te conseille cet événement : ${window.location.href}`);
      link.href = `mailto:?subject=${subject}&body=${body}`;
    } else if (link.href.includes('linkedin.com')) {
      link.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    }
  });

  // === FOOTER de l'article (date de publication) ===

  const articleFooter = article.querySelector('article > footer');
  if (articleFooter) {
    articleFooter.style.display = 'none';  // Pas de date de pub fournie par OpenAgenda
  }
}


// ----------------------------------------------------------------------------
// CHARGEMENT DES ÉVÉNEMENTS SIMILAIRES
// ----------------------------------------------------------------------------

async function loadSimilarEvents(currentEventId) {
  const aside = document.querySelector('body > aside[aria-labelledby="titre-similaires"]');
  if (!aside) return;

  const ul = aside.querySelector('ul');
  if (!ul) return;

  setBusy(aside, true);

  try {
    const { events } = await fetchEvents({ size: 4 });

    // Exclure l'événement courant
    const similar = events.filter(ev => String(ev.uid) !== String(currentEventId)).slice(0, 3);

    if (similar.length === 0) {
      aside.style.display = 'none';
      return;
    }

    const items = similar.map(event => el('li', {}, [createEventCard(event)]));
    replaceContent(ul, items);
  } catch (err) {
    aside.style.display = 'none';
    console.warn('Événements similaires indisponibles:', err);
  } finally {
    setBusy(aside, false);
  }
}


// ----------------------------------------------------------------------------
// AFFICHAGE D'ERREUR PLEINE PAGE
// ----------------------------------------------------------------------------

function showFullPageError(error) {
  const main = document.querySelector('main');
  if (!main) return;

  const human = humanizeError(error);

  const errorBlock = el('section', {
    role: 'alert',
    style: `
      max-width: 40rem;
      margin: 4rem auto;
      padding: 2rem;
      text-align: center;
      background: white;
      border: 2px solid #2E1065;
      border-radius: 1rem;
      box-shadow: 4px 4px 0 #EC4899;
    `,
  }, [
    el('h1', { style: 'color:#BE185D;margin-bottom:1rem;' }, [human.title]),
    el('p', { style: 'margin-bottom:1.5rem;color:#2E1065;' }, [human.message]),
    el('p', {}, [
      el('a', {
        href: 'index.html',
        class: 'vn-btn-primary',
      }, ['← Retour à la liste']),
    ]),
  ]);

  clearChildren(main);
  main.appendChild(errorBlock);

  // Annonce urgente + focus sur le titre d'erreur
  announceUrgent(human.title);
  moveFocusTo(errorBlock.querySelector('h1'));
}


// ============================================================================
// MODULE REST RÉSERVATIONS
// ============================================================================
// Démonstration complète des verbes REST GET / POST / PATCH / DELETE.
//
// Routes "ressource" exposées :
//
//   GET    /reservations            → liste de toutes les réservations
//   GET    /reservations/{id}       → détail d'une réservation
//   POST   /reservations            → crée une réservation
//   PATCH  /reservations/{id}       → modifie partiellement
//   DELETE /reservations/{id}       → annule définitivement
//
// IMPLÉMENTATION : la persistance est simulée via localStorage pour rester
// sur du frontend pur. Pour passer en prod, il suffirait de remplacer le
// corps de apiRequest() par un fetch() réel vers un backend Node/Express
// ou PHP — la signature publique du module reste identique.
//
// IDEMPOTENCE :
//   - GET, PUT, DELETE sont idempotents (appel répété = même résultat)
//   - POST et PATCH sont non-idempotents (POST crée, PATCH peut diverger)
// ============================================================================

const RESERVATIONS_STORAGE_KEY = 'vn_reservations_v1';
const FAKE_LATENCY_MS = 250;  // Simule la latence réseau pour montrer les loading states

/**
 * Wrapper REST générique.
 * Simule les 4 verbes en lisant/écrivant localStorage.
 *
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} path - Format /reservations ou /reservations/{id}
 * @param {Object|null} body - Corps de la requête pour POST/PATCH
 * @returns {Promise<Object|Object[]|null>}
 */
async function apiRequest(method, path, body = null) {
  // Délai artificiel — simule la latence d'un vrai serveur
  await new Promise(r => setTimeout(r, FAKE_LATENCY_MS));

  // Parse path : /reservations ou /reservations/{id}
  const match = path.match(/^\/reservations(?:\/(.+))?$/);
  if (!match) {
    const err = new Error(`Route inconnue : ${path}`);
    err.status = 404;
    throw err;
  }
  const id = match[1];

  // Lire le "store" local
  let all = [];
  try {
    const raw = localStorage.getItem(RESERVATIONS_STORAGE_KEY);
    all = raw ? JSON.parse(raw) : [];
  } catch {
    all = [];
  }

  switch (method) {
    case 'GET': {
      if (id) {
        // GET /reservations/{id}
        const found = all.find(r => r.id === id);
        if (!found) {
          const err = new Error('Réservation introuvable');
          err.status = 404;
          throw err;
        }
        return found;
      }
      // GET /reservations
      return all;
    }

    case 'POST': {
      // Création d'une nouvelle ressource — non idempotent
      const newRes = {
        id: 'res_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString(),
        ...body,
      };
      all.push(newRes);
      localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(all));
      // Convention REST : 201 Created retourne la ressource créée
      return newRes;
    }

    case 'PATCH': {
      // Modification partielle — on fusionne avec l'existant
      const idx = all.findIndex(r => r.id === id);
      if (idx === -1) {
        const err = new Error('Réservation introuvable');
        err.status = 404;
        throw err;
      }
      all[idx] = { ...all[idx], ...body, updatedAt: new Date().toISOString() };
      localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(all));
      return all[idx];
    }

    case 'DELETE': {
      // Suppression — idempotente (supprimer un item déjà supprimé = no-op silencieux,
      // selon convention REST "204 No Content")
      const filtered = all.filter(r => r.id !== id);
      localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(filtered));
      return null;
    }

    default: {
      const err = new Error(`Verbe HTTP non supporté : ${method}`);
      err.status = 405;
      throw err;
    }
  }
}

// --- API publique typée (utilisée par le flow ci-dessous) ---

async function getReservationByEventId(eventId) {
  const all = await apiRequest('GET', '/reservations');
  return all.find(r => String(r.eventId) === String(eventId)) || null;
}

async function createReservation(data) {
  return apiRequest('POST', '/reservations', data);
}

async function updateReservation(id, partialData) {
  return apiRequest('PATCH', `/reservations/${id}`, partialData);
}

async function deleteReservation(id) {
  return apiRequest('DELETE', `/reservations/${id}`);
}


// ----------------------------------------------------------------------------
// FLOW UI : formulaire ⇄ récap réservation
// ----------------------------------------------------------------------------

/**
 * Au chargement de la fiche événement, vérifie si une réservation existe
 * déjà pour cet événement (via GET) et affiche l'UI appropriée.
 */
async function initReservationFlow(event) {
  const section = document.querySelector('section[aria-labelledby="titre-reservation"]');
  if (!section) return;

  try {
    const existing = await getReservationByEventId(event.uid);
    if (existing) {
      showReservationSummary(section, existing, event);
    } else {
      setupReservationForm(section, event);
    }
  } catch (err) {
    console.warn('[reservations] Init flow failed:', err);
    setupReservationForm(section, event);  // fallback sur le formulaire vierge
  }
}

/**
 * Extrait les données du formulaire en un objet sérialisable.
 */
function extractFormData(form, event) {
  const fd = new FormData(form);
  return {
    eventId: String(event.uid),
    eventTitle: event.title,
    eventDate: event.startDate,
    nom: fd.get('nom') || '',
    prenom: fd.get('prenom') || '',
    email: fd.get('email') || '',
    telephone: fd.get('telephone') || '',
    jours: fd.getAll('jours'),
    accessibilite: fd.getAll('accessibilite'),
    newsletter: !!fd.get('newsletter'),
  };
}

/**
 * Configure le formulaire pour un POST (création).
 */
function setupReservationForm(section, event) {
  const form = section.querySelector('form');
  if (!form) return;

  // S'assurer que le formulaire est visible et le récap retiré
  form.style.display = '';
  section.querySelector('.reservation-summary')?.remove();

  // Reset du bouton submit
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Confirmer mon inscription';

  // Important : on clone le form pour supprimer tous les anciens listeners
  // (sinon après edit/cancel, on aurait des doublons)
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setBusy(section, true);
    announce('Envoi de votre réservation en cours.');

    try {
      // ─── POST /reservations ───
      const reservation = await createReservation(extractFormData(newForm, event));
      announce(`Réservation confirmée. Numéro ${reservation.id}.`);
      showReservationSummary(section, reservation, event);
    } catch (err) {
      announceUrgent('Erreur lors de la réservation. Veuillez réessayer.');
      console.error('[POST /reservations]', err);
    } finally {
      setBusy(section, false);
    }
  });
}

/**
 * Affiche le récapitulatif d'une réservation existante avec boutons
 * Modifier (PATCH) et Annuler (DELETE).
 */
function showReservationSummary(section, reservation, event) {
  // Cacher le formulaire
  const form = section.querySelector('form');
  if (form) form.style.display = 'none';

  // Retirer un éventuel récap précédent
  section.querySelector('.reservation-summary')?.remove();

  const dlItems = [
    el('div', {}, [
      el('dt', { style: 'font-weight:700; color:#2E1065; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em;' }, ['Au nom de']),
      el('dd', { style: 'margin-top:0.125rem;' }, [`${reservation.prenom} ${reservation.nom}`]),
    ]),
    el('div', {}, [
      el('dt', { style: 'font-weight:700; color:#2E1065; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em;' }, ['Email']),
      el('dd', { style: 'margin-top:0.125rem;' }, [reservation.email]),
    ]),
  ];

  if (reservation.telephone) {
    dlItems.push(el('div', {}, [
      el('dt', { style: 'font-weight:700; color:#2E1065; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em;' }, ['Téléphone']),
      el('dd', { style: 'margin-top:0.125rem;' }, [reservation.telephone]),
    ]));
  }

  if (reservation.jours?.length) {
    dlItems.push(el('div', {}, [
      el('dt', { style: 'font-weight:700; color:#2E1065; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em;' }, ['Jours de présence']),
      el('dd', { style: 'margin-top:0.125rem;' }, [reservation.jours.join(', ')]),
    ]));
  }

  if (reservation.accessibilite?.length) {
    dlItems.push(el('div', {}, [
      el('dt', { style: 'font-weight:700; color:#2E1065; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.1em;' }, ['Accessibilité']),
      el('dd', { style: 'margin-top:0.125rem;' }, [reservation.accessibilite.join(', ')]),
    ]));
  }

  const updateInfo = reservation.updatedAt
    ? ` · Modifiée le ${new Date(reservation.updatedAt).toLocaleString('fr-FR')}`
    : '';

  const summary = el('div', {
    class: 'reservation-summary',
    role: 'region',
    'aria-label': 'Votre réservation confirmée',
    style: 'padding:1.5rem 2rem; background:#FFFBF5; border:2px solid #2E1065; border-radius:1rem; box-shadow:6px 6px 0 #BEF264;',
  }, [
    el('p', { style: 'color:#5B21B6; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.15em; font-weight:700; margin-bottom:0.5rem;' }, ['✓ Réservation confirmée']),
    el('p', { style: 'font-family:\'Bricolage Grotesque\', system-ui, sans-serif; font-size:1.5rem; font-weight:800; color:#2E1065; margin-bottom:0.25rem; letter-spacing:-0.02em;' }, [`Numéro : ${reservation.id}`]),
    el('p', { style: 'font-size:0.875rem; color:#6D5B9F; margin-bottom:1.5rem;' }, [
      `Enregistrée le ${new Date(reservation.createdAt).toLocaleString('fr-FR')}${updateInfo}`,
    ]),
    el('dl', { style: 'display:grid; gap:0.75rem; margin-bottom:1.5rem; font-size:0.9375rem;' }, dlItems),
    el('div', { style: 'display:flex; gap:0.75rem; flex-wrap:wrap; padding-top:1rem; border-top:1px solid #EDE9FE;' }, [
      el('button', {
        type: 'button',
        class: 'vn-btn-outline',
        onClick: () => handleEditReservation(section, reservation, event),
      }, ['✏️ Modifier ma réservation']),
      el('button', {
        type: 'button',
        class: 'vn-btn-outline',
        style: 'border-color:#BE185D; color:#BE185D;',
        onClick: () => handleDeleteReservation(section, reservation, event),
      }, ['🗑️ Annuler ma réservation']),
    ]),
  ]);

  // Insérer juste après le h2 (avant le formulaire caché)
  const h2 = section.querySelector('h2');
  if (h2) {
    h2.insertAdjacentElement('afterend', summary);
  } else {
    section.appendChild(summary);
  }
}

/**
 * Bascule en mode édition : ré-affiche le formulaire pré-rempli.
 * À la soumission, fait un PATCH (et non un POST).
 */
function handleEditReservation(section, reservation, event) {
  // Retirer le récap
  section.querySelector('.reservation-summary')?.remove();

  const form = section.querySelector('form');
  if (!form) return;

  // Cloner pour reset les anciens listeners
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  newForm.style.display = '';

  // Pré-remplir les champs texte
  if (newForm.querySelector('[name="nom"]')) newForm.querySelector('[name="nom"]').value = reservation.nom || '';
  if (newForm.querySelector('[name="prenom"]')) newForm.querySelector('[name="prenom"]').value = reservation.prenom || '';
  if (newForm.querySelector('[name="email"]')) newForm.querySelector('[name="email"]').value = reservation.email || '';
  if (newForm.querySelector('[name="telephone"]')) newForm.querySelector('[name="telephone"]').value = reservation.telephone || '';

  // Pré-cocher les checkboxes
  newForm.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.name === 'jours' && reservation.jours?.includes(cb.value)) cb.checked = true;
    else if (cb.name === 'accessibilite' && reservation.accessibilite?.includes(cb.value)) cb.checked = true;
    else if (cb.name === 'newsletter') cb.checked = !!reservation.newsletter;
  });

  // Changer le label du bouton submit
  const submitBtn = newForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = '💾 Enregistrer les modifications';

  announce('Formulaire de modification chargé. Vos données précédentes sont pré-remplies.');
  moveFocusTo(newForm.querySelector('h2, [name="nom"]'));

  // Brancher le submit handler en mode PATCH
  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setBusy(section, true);
    announce('Mise à jour de votre réservation en cours.');

    try {
      // ─── PATCH /reservations/{id} ───
      const updated = await updateReservation(reservation.id, extractFormData(newForm, event));
      announce('Réservation modifiée avec succès.');
      showReservationSummary(section, updated, event);
    } catch (err) {
      announceUrgent('Erreur lors de la modification. Veuillez réessayer.');
      console.error('[PATCH /reservations]', err);
    } finally {
      setBusy(section, false);
    }
  });
}

/**
 * Annule une réservation après confirmation utilisateur.
 */
async function handleDeleteReservation(section, reservation, event) {
  const ok = window.confirm(
    `Voulez-vous vraiment annuler la réservation ${reservation.id} ?\n\nCette action est irréversible.`
  );
  if (!ok) return;

  setBusy(section, true);
  announce('Annulation en cours.');

  try {
    // ─── DELETE /reservations/{id} ───
    await deleteReservation(reservation.id);
    announce('Réservation annulée avec succès.');
    // Retour au formulaire vierge
    setupReservationForm(section, event);
    moveFocusTo(section.querySelector('h2'));
  } catch (err) {
    announceUrgent('Erreur lors de l\'annulation.');
    console.error('[DELETE /reservations]', err);
  } finally {
    setBusy(section, false);
  }
}


// ----------------------------------------------------------------------------
// INIT
// ----------------------------------------------------------------------------

async function init() {
  // 1. Récupérer l'ID
  const eventId = getEventIdFromUrl();

  if (!eventId) {
    showFullPageError({
      type: 'not-found',
      message: 'Aucun identifiant d\'événement fourni dans l\'URL.',
    });
    return;
  }

  // 2. État loading initial
  const article = document.querySelector('main > article');
  if (article) setBusy(article, true);
  announce('Chargement de l\'événement en cours.');

  try {
    // 3. Fetch parallèle : événement principal + similaires
    const event = await fetchEventById(eventId);

    // 4. Hydratation
    hydrateEvent(event);
    announce(`Événement ${event.title} chargé.`);

    // 5. Flow réservation REST (POST/PATCH/DELETE) — voir module ci-dessus
    initReservationFlow(event);

    // 6. Similaires en arrière-plan (non bloquant pour le contenu principal)
    loadSimilarEvents(eventId);

  } catch (err) {
    showFullPageError(err);
  } finally {
    if (article) setBusy(article, false);
  }
}

// Démarrer après le DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
