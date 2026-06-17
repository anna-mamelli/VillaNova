/**
 * VillaNova · index.js
 * ============================================================================
 * Point d'entrée de la page d'accueil.
 *
 * Responsabilités :
 *  1. Chargement initial de la liste d'événements depuis OpenAgenda
 *  2. Affichage de l'événement "à la une"
 *  3. Filtrage par catégorie (mots-clés)
 *  4. Recherche libre par texte
 *  5. Pagination
 *  6. Annonces accessibles à chaque changement
 *  7. Gestion des erreurs avec retry
 * ============================================================================
 */

import { fetchEvents, fetchFeaturedEvent, isLiveMode } from './api.js';
import {
  createEventCard,
  createLoadingSkeletons,
  createEmptyState,
  createErrorState,
  formatDate,
  formatBadgeDate,
  el,
  clearChildren,
  replaceContent,
} from './ui.js';
import {
  announce,
  announceUrgent,
  moveFocusTo,
  setBusy,
  setActiveAriaCurrent,
} from './a11y.js';


// ----------------------------------------------------------------------------
// ÉTAT GLOBAL DE LA PAGE
// ----------------------------------------------------------------------------

/**
 * État unique de la page. Source de vérité — quand on le modifie, on
 * re-rend l'UI. Pattern unidirectionnel inspiré de Redux/React, sans
 * dépendance externe.
 */
const state = {
  events: [],
  total: 0,
  loading: false,
  error: null,
  currentCategory: 'tous',
  currentSearch: '',
  cursor: null,        // Pour la pagination "voir plus"
  hasMore: false,
};


// ----------------------------------------------------------------------------
// DEBUG
// ----------------------------------------------------------------------------

/**
 * Active les logs détaillés dans la console pour diagnostiquer les filtres.
 * À mettre à `false` en production.
 */
const DEBUG_FILTERS = true;


/**
 * Mapping des catégories de l'UI vers les mots-clés OpenAgenda.
 *
 * Les liens du HTML utilisent des slugs au pluriel sans accents
 * (?categorie=concerts, ?categorie=theatre…), alors que les keywords
 * OpenAgenda sont des mots libres au singulier avec accents
 * (concert, théâtre, exposition…).
 *
 * Ce mapping fait le pont entre les deux. Pour ajouter une catégorie :
 *   1. Ajouter le lien dans le HTML : <a href="?categorie=NOUVEAU">…
 *   2. Ajouter ici la liste des keywords qui doivent matcher.
 */
const CATEGORY_MAP = {
  tous: null,  // null = pas de filtre
  concerts: ['concert', 'musique', 'rock', 'jazz', 'électro', 'electro', 'pop', 'rap'],
  expositions: ['exposition', 'expo', 'photographie', 'art'],
  theatre: ['théâtre', 'theatre', 'spectacle', 'pièce'],
  festivals: ['festival'],
  ateliers: ['atelier', 'workshop', 'initiation', 'stage'],
};

/**
 * Normalise une chaîne pour comparaison : lowercase + retrait des accents.
 * "Théâtre" → "theatre", "ÉCO-Responsable" → "eco-responsable"
 */
function normalizeStr(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Renvoie true si l'événement correspond à la catégorie sélectionnée.
 *
 * IMPORTANT : on splitte les keywords en mots et on compare mot à mot
 * pour éviter les faux positifs.
 *
 * Exemple du piège évité :
 *   'photographie'.includes('rap')  → true  (à cause de "g-r-a-p" dans le mot)
 *   matchesWord('photographie', 'rap') → false (comparaison mot entier)
 */
function matchesCategory(event, categoryKey) {
  const acceptedKeywords = CATEGORY_MAP[categoryKey];
  if (!acceptedKeywords) return true;  // 'tous' ou catégorie inconnue → pas de filtre

  return event.keywords.some(kw => {
    // Un keyword peut être un mot simple ('concert') ou multi-mots ('tout public').
    // On le splitte en mots normalisés.
    const words = normalizeStr(kw).split(/[\s\-_,]+/).filter(Boolean);

    return words.some(word =>
      acceptedKeywords.some(accepted => {
        const acc = normalizeStr(accepted);
        // Match exact OU le keyword commence par accepté
        // (ex: 'concert' match 'concerts' / 'concertistes', mais pas 'rap' dans 'photographie')
        return word === acc || word.startsWith(acc);
      })
    );
  });
}


// ----------------------------------------------------------------------------
// SÉLECTEURS DOM (mis en cache pour éviter de re-querier à chaque render)
// ----------------------------------------------------------------------------

const selectors = {};

function cacheSelectors() {
  selectors.featuredContainer = document.querySelector('section[aria-labelledby="titre-une"] article');
  selectors.featuredSection = document.querySelector('section[aria-labelledby="titre-une"]');
  selectors.listContainer = document.querySelector('section[aria-labelledby="titre-liste"] > ul');
  selectors.listSection = document.querySelector('section[aria-labelledby="titre-liste"]');
  selectors.listMeta = document.querySelector('section[aria-labelledby="titre-liste"] > p small');
  selectors.searchForm = document.querySelector('search form');
  selectors.searchInput = document.querySelector('search form input[type="search"]');
  selectors.locationFilter = document.querySelector('search form select');
  selectors.categoryNav = document.querySelector('nav[aria-label="Filtrer par catégorie"]');
  selectors.pagination = document.querySelector('section[aria-labelledby="titre-liste"] > nav[aria-label*="Pagination"]');
}


// ----------------------------------------------------------------------------
// RENDU DE L'ÉVÉNEMENT À LA UNE
// ----------------------------------------------------------------------------

async function renderFeatured() {
  if (DEBUG_FILTERS) console.log('%c[VillaNova] renderFeatured() START', 'color:#5B21B6; font-weight:bold;');

  if (!selectors.featuredContainer) {
    if (DEBUG_FILTERS) console.warn('[VillaNova] renderFeatured: featuredContainer introuvable');
    return;
  }

  setBusy(selectors.featuredSection, true);

  try {
    const featured = await fetchFeaturedEvent();
    if (DEBUG_FILTERS) console.log('[VillaNova] fetchFeaturedEvent() résultat :', featured);

    if (!featured) {
      if (DEBUG_FILTERS) console.warn('[VillaNova] Aucun event featured renvoyé, section cachée');
      selectors.featuredSection?.style.setProperty('display', 'none');
      return;
    }

    // Mettre à jour les zones du HTML existant (on ne reconstruit pas tout
    // pour préserver le squelette CSS - on remplit juste les blanks)
    const article = selectors.featuredContainer;
    const detailUrl = `event-detail.html?id=${encodeURIComponent(featured.uid)}`;

    // Eyebrow (1ère catégorie ou type)
    const eyebrowEl = article.querySelector('header > p:first-child small');
    if (eyebrowEl) {
      const tag = featured.keywords[0] || 'Événement à venir';
      eyebrowEl.textContent = tag;
    }

    // Titre + lien
    const titleLink = article.querySelector('h3 a');
    if (titleLink) {
      titleLink.textContent = featured.title;
      titleLink.href = detailUrl;
    }

    // Image
    // Le HTML utilise une balise <picture> avec des <source> qui pointent vers
    // des images statiques locales. Quand on hydrate dynamiquement avec une URL
    // venant de l'API, on doit SUPPRIMER les <source> pour que le navigateur
    // tombe sur le <img> fallback dont on contrôle le src.
    if (DEBUG_FILTERS) {
      console.group('%c[VillaNova] renderFeatured() image', 'color:#5B21B6; font-weight:bold;');
      console.log('Event UID :', featured.uid);
      console.log('Event title :', featured.title);
      console.log('imageUrl reçu de l\'API :', featured.imageUrl || '(VIDE)');
      console.log('imageAlt :', featured.imageAlt);
    }

    const picture = article.querySelector('picture');
    const img = article.querySelector('img[itemprop="image"]');

    if (img && featured.imageUrl) {
      // Supprimer les <source> AVIF/WebP statiques — sinon ils sont
      // prioritaires sur le <img> et masquent l'image API.
      if (picture) {
        const sourcesRemoved = picture.querySelectorAll('source').length;
        picture.querySelectorAll('source').forEach(s => s.remove());
        if (DEBUG_FILTERS) console.log(`<source> supprimés : ${sourcesRemoved}`);
      }

      // Retirer width/height pour ne pas forcer un ratio inadapté
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.removeAttribute('srcset');  // Au cas où

      img.alt = featured.imageAlt || featured.title;
      img.src = featured.imageUrl;

      if (DEBUG_FILTERS) console.log('img.src final :', img.src);
    } else if (DEBUG_FILTERS) {
      console.warn('Image NON mise à jour. img:', !!img, 'imageUrl:', featured.imageUrl);
    }

    if (DEBUG_FILTERS) console.groupEnd();

    // Description
    const descEl = article.querySelector('p[itemprop="description"]');
    if (descEl) {
      descEl.textContent = featured.description;
    }

    // Footer (date, lieu, tarif)
    const footerParas = article.querySelectorAll('footer p');
    if (footerParas.length >= 1 && featured.startDate) {
      const timeEl = footerParas[0].querySelector('time');
      if (timeEl) {
        timeEl.dateTime = featured.startDate;
        timeEl.textContent = formatDate(featured.startDate, { withTime: true });
      }
    }
    if (footerParas.length >= 2) {
      const locationEl = footerParas[1].querySelector('[itemprop="location"]');
      if (locationEl) {
        const nameEl = locationEl.querySelector('[itemprop="name"]');
        if (nameEl && featured.locationName) nameEl.textContent = featured.locationName;
      }
    }
    if (footerParas.length >= 3) {
      const priceEl = footerParas[2].querySelector('[itemprop="price"]');
      if (priceEl) {
        priceEl.textContent = featured.isFree ? 'Gratuit' : (featured.conditions || 'Voir détails');
      }
    }

  } catch (err) {
    // En cas d'erreur sur la featured, on cache la section silencieusement —
    // pas critique pour l'utilisation du site.
    selectors.featuredSection?.style.setProperty('display', 'none');
    console.warn('Featured event indisponible:', err);
  } finally {
    setBusy(selectors.featuredSection, false);
  }
}


// ----------------------------------------------------------------------------
// RENDU DE LA LISTE
// ----------------------------------------------------------------------------

function renderList() {
  if (!selectors.listContainer) return;

  // 1. État loading
  if (state.loading && state.events.length === 0) {
    setBusy(selectors.listSection, true);
    replaceContent(selectors.listContainer, createLoadingSkeletons(6));
    if (selectors.listMeta) {
      selectors.listMeta.textContent = 'Chargement des événements…';
    }
    announce('Chargement des événements en cours.');
    return;
  }

  // 2. État erreur
  if (state.error && state.events.length === 0) {
    setBusy(selectors.listSection, false);
    replaceContent(selectors.listContainer, createErrorState(state.error, () => loadEvents({ reset: true })));
    return;
  }

  setBusy(selectors.listSection, false);

  // 3. État vide
  if (state.events.length === 0) {
    replaceContent(selectors.listContainer, createEmptyState(state.currentSearch));
    if (selectors.listMeta) {
      selectors.listMeta.textContent = state.currentSearch
        ? `Aucun résultat pour "${state.currentSearch}"`
        : 'Aucun événement';
    }
    announce(state.currentSearch
      ? `Aucun résultat pour ${state.currentSearch}`
      : 'Aucun événement à afficher');
    return;
  }

  // 4. État plein
  const cards = state.events.map(event => el('li', {}, [createEventCard(event)]));
  replaceContent(selectors.listContainer, cards);

  if (selectors.listMeta) {
    const count = state.events.length;
    const isFiltered = state.currentCategory !== 'tous';
    const filterLabel = isFiltered
      ? ` filtré${count > 1 ? 's' : ''} dans la catégorie « ${state.currentCategory} »`
      : '';
    selectors.listMeta.textContent = `${count} événement${count > 1 ? 's' : ''}${filterLabel} · triés par date`;
  }

  // Annonce accessible : nombre de résultats
  const announceMsg = state.currentCategory !== 'tous'
    ? `${state.events.length} événement${state.events.length > 1 ? 's' : ''} pour la catégorie ${state.currentCategory}.`
    : `${state.events.length} événement${state.events.length > 1 ? 's' : ''} affiché${state.events.length > 1 ? 's' : ''}.`;
  announce(announceMsg);

  // Mettre à jour la pagination
  renderPagination();
}

function renderPagination() {
  if (!selectors.pagination) return;

  const ul = selectors.pagination.querySelector('ul');
  if (!ul) return;

  clearChildren(ul);

  // Bouton "Voir plus" (pagination cursor-based de l'API)
  if (state.hasMore) {
    const li = el('li', {}, [
      el('button', {
        type: 'button',
        class: 'vn-btn-outline',
        onClick: () => loadEvents({ append: true }),
      }, ['Voir plus d\'événements']),
    ]);
    ul.appendChild(li);
  }
}


// ----------------------------------------------------------------------------
// CHARGEMENT DES ÉVÉNEMENTS
// ----------------------------------------------------------------------------

/**
 * Charge les événements depuis l'API selon l'état actuel.
 *
 * @param {Object} [options]
 * @param {boolean} [options.reset] - Vider le state avant le fetch
 * @param {boolean} [options.append] - Ajouter à la liste existante (pagination)
 */
async function loadEvents({ reset = false, append = false } = {}) {
  if (state.loading) return;  // Anti double-fetch

  if (reset) {
    state.events = [];
    state.cursor = null;
    state.error = null;
  }

  state.loading = true;
  if (!append) renderList();  // Affiche les skeletons

  try {
    // Stratégie de filtrage par catégorie SELON LE MODE :
    //
    // - MODE DÉMO  : on fetch tout et on filtre côté client par keywords
    //                (sample-data.js a des keywords contrôlés et standardisés)
    //
    // - MODE RÉEL  : on délègue le filtrage à l'API OpenAgenda en passant la
    //                catégorie comme paramètre `search`. C'est nécessaire car
    //                les agendas OpenAgenda réels ont des keywords variés
    //                (parfois absents, en plusieurs langues, non standardisés)
    //                et le filtre côté client n'aurait que peu d'événements à
    //                filtrer (12 par page) — peu pertinent.
    //
    // Le param `search` d'OpenAgenda fait une recherche full-text dans
    // title + description + keywords, donc ça marche sur n'importe quel agenda.

    let apiSearch = state.currentSearch || null;

    if (isLiveMode() && state.currentCategory !== 'tous') {
      // En mode réel, on transforme la catégorie en search term API.
      // On prend le premier mot-clé de CATEGORY_MAP qui est le plus représentatif.
      const categoryKeyword = CATEGORY_MAP[state.currentCategory]?.[0];
      if (categoryKeyword) {
        apiSearch = state.currentSearch
          ? `${state.currentSearch} ${categoryKeyword}`
          : categoryKeyword;
      }
    }

    // === DEBUG : trace de la requête en cours ===
    // Pour activer/désactiver, modifier la valeur de DEBUG_FILTERS au top du fichier.
    if (DEBUG_FILTERS) {
      console.group('%c[VillaNova] loadEvents()', 'color:#5B21B6; font-weight:bold;');
      console.log('Mode :', isLiveMode() ? 'RÉEL (vraie API OpenAgenda)' : 'DÉMO (sample-data)');
      console.log('Catégorie sélectionnée :', state.currentCategory);
      console.log('Search libre utilisateur :', state.currentSearch || '(aucune)');
      console.log('→ Param `search` envoyé à l\'API :', apiSearch || '(aucun)');
      console.log('→ Param `after` (pagination) :', append ? state.cursor : '(début)');
    }

    const result = await fetchEvents({
      after: append ? state.cursor : null,
      search: apiSearch,
    });

    if (DEBUG_FILTERS) {
      console.log('← Réponse API :', {
        nbEvents: result.events.length,
        total: result.total,
        firstTitle: result.events[0]?.title,
        firstKeywords: result.events[0]?.keywords,
      });
    }

    state.events = append ? [...state.events, ...result.events] : result.events;
    state.totalFromApi = result.total;  // Total brut renvoyé par l'API
    state.cursor = result.after;
    state.hasMore = result.events.length > 0 && result.after !== null;

    // Filtrage côté client : seulement en mode démo
    // (En mode réel, l'API a déjà filtré via le search.)
    if (!isLiveMode() && state.currentCategory !== 'tous') {
      const beforeFilter = state.events.length;
      state.events = state.events.filter(ev => matchesCategory(ev, state.currentCategory));
      if (DEBUG_FILTERS) {
        console.log(`Filtrage côté client : ${beforeFilter} → ${state.events.length} événements`);
      }
    }

    if (DEBUG_FILTERS) {
      console.log('✓ Résultat final affiché :', state.events.length, 'événements');
      console.groupEnd();
    }

    // Compteur cohérent avec ce qu'on affiche réellement
    state.total = state.events.length;

    state.error = null;

  } catch (err) {
    state.error = err;
    announceUrgent(`Erreur de chargement : ${err.message || 'inconnue'}.`);
    console.error('Erreur fetchEvents:', err);
  } finally {
    state.loading = false;
    renderList();
  }
}


// ----------------------------------------------------------------------------
// HANDLERS D'ÉVÉNEMENTS UTILISATEUR
// ----------------------------------------------------------------------------

/**
 * Soumission du formulaire de recherche.
 * preventDefault() pour ne pas recharger la page.
 */
function handleSearchSubmit(e) {
  e.preventDefault();
  const term = (selectors.searchInput?.value || '').trim();
  state.currentSearch = term;

  // Annonce avant la recherche
  if (term) {
    announce(`Recherche en cours pour ${term}`);
  } else {
    announce('Affichage de tous les événements');
  }

  loadEvents({ reset: true }).then(() => {
    // Après le résultat, déplacer le focus sur le titre de la liste
    // pour que les utilisateurs clavier/lecteur d'écran soient guidés.
    moveFocusTo('#titre-liste', { preventScroll: false });
  });
}

/**
 * Clic sur un filtre catégorie.
 * Les liens utilisent des fragments (#concerts) plutôt que des chemins
 * absolus (/?categorie=concerts), pour éviter tout reload accidentel
 * de la page si le preventDefault() ne prend pas à temps.
 */
function handleCategoryClick(e) {
  // Cible : <a href="#concerts" aria-current="...">Concerts</a>
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;

  // On ne capte que les liens de la nav catégorie (et pas le skip-link)
  const href = link.getAttribute('href');
  if (!href || href === '#' || href === '#contenu-principal') return;

  e.preventDefault();

  // Extraire la catégorie : "#concerts" → "concerts"
  const cat = href.slice(1) || 'tous';

  // Si c'est la même catégorie qu'avant, ne rien faire
  if (cat === state.currentCategory) return;

  state.currentCategory = cat;

  // Mettre à jour aria-current sur tous les liens
  setActiveAriaCurrent(selectors.categoryNav, link, 'true');

  announce(cat === 'tous'
    ? 'Filtre désactivé, tous les événements affichés.'
    : `Filtre actif : ${cat}.`);

  loadEvents({ reset: true });
}


// ----------------------------------------------------------------------------
// INIT
// ----------------------------------------------------------------------------

function init() {
  cacheSelectors();

  // Brancher les handlers
  selectors.searchForm?.addEventListener('submit', handleSearchSubmit);
  selectors.categoryNav?.addEventListener('click', handleCategoryClick);

  // Premier chargement parallèle (featured + liste)
  Promise.allSettled([
    renderFeatured(),
    loadEvents({ reset: true }),
  ]);
}

// Démarrer après le DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
