/**
 * VillaNova · api.js
 *
 * MODE DÉMO AUTOMATIQUE
 * ----------------------------------------------------------------------------
 * Si la clé publique n'est pas configurée, le code
 * bascule automatiquement en mode DÉMO et utilise les données fictives de
 * sample-data.js. Le projet est démontrable même sans configurer l'API.
 * Un message console affiche le mode actif au démarrage.
 *
 * ============================================================================
 */

import {
  getSampleEventsList,
  getSampleEventById,
} from './sample-data.js';


// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

export const API_CONFIG = {
  baseUrl: 'https://api.openagenda.com/v2',

  /**
   * Liste des UID d'agendas OpenAgenda à interroger.
   * Le code agrège les événements de tous les agendas, dédoublonne
   * et trie par date. Ajouter/retirer des UIDs ici suffit.
   *
   * Configuration actuelle (Marseille) :
   *   - 24882772 : Live Massila (concerts musique)
   *   - 21769447 : Aix-Marseille-Provence Métropole (événements officiels)
   *   - 65135660 : gmem-CNCM-marseille (musique contemporaine)
   */
  agendaUids: [
    '24882772',
    '21769447',
    '65135660',
  ],

  publicKey: 'ae4e47cec48e4cc5b02e32a4d7f9a44c',


  // Tailles par défaut
  pageSize: 12,
  featuredSize: 1,

  // Timeout des requêtes
  timeoutMs: 10_000,

  // Langue préférée pour les champs multilingues
  preferredLang: 'fr',
};


// ----------------------------------------------------------------------------
// DÉTECTION DU MODE
// ----------------------------------------------------------------------------

/**
 * Renvoie la liste des agendas configurés (placeholders REMPLACER_ exclus).
 */
function getValidAgendaUids() {
  if (!Array.isArray(API_CONFIG.agendaUids)) return [];
  return API_CONFIG.agendaUids.filter(uid =>
    uid && !String(uid).startsWith('REMPLACER_')
  );
}

/**
 * Renvoie true si au moins une clé API + un UID sont configurés.
 */
export function isLiveMode() {
  return (
    API_CONFIG.publicKey &&
    !API_CONFIG.publicKey.startsWith('REMPLACER_') &&
    getValidAgendaUids().length > 0
  );
}

// Affiche le mode actif au chargement (utile pour la défense orale)
const MODE = isLiveMode() ? 'RÉEL' : 'DÉMO';
const validUids = getValidAgendaUids();
console.info(
  `%c[VillaNova] Mode API : ${MODE}`,
  `background: ${MODE === 'RÉEL' ? '#5B21B6' : '#EC4899'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;`,
  MODE === 'DÉMO'
    ? '\nDonnées fictives utilisées (sample-data.js). Pour activer la vraie API OpenAgenda, configurer api.js — voir JOUR04-defense.md.'
    : `\n${validUids.length} agenda${validUids.length > 1 ? 's' : ''} configuré${validUids.length > 1 ? 's' : ''} : ${validUids.join(', ')}`
);


// ----------------------------------------------------------------------------
// CACHE EN MÉMOIRE
// ----------------------------------------------------------------------------

const requestCache = new Map();


// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

/**
 * Construit une URL avec query params, en filtrant les valeurs vides.
 */
function buildUrl(path, params = {}) {
  const url = new URL(API_CONFIG.baseUrl + path);
  url.searchParams.set('key', API_CONFIG.publicKey);

  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      v.forEach(item => url.searchParams.append(`${k}[]`, item));
    } else {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

/**
 * Wrapper fetch avec timeout, cache, et gestion d'erreurs typées.
 *
 * Erreurs typées renvoyées :
 *   - timeout : la requête a dépassé API_CONFIG.timeoutMs
 *   - http (status 4xx/5xx) : erreur HTTP avec status
 *   - network : CORS, DNS, hors-ligne, fetch failed
 */
async function safeFetch(url) {
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Tentative de lecture du message d'erreur OpenAgenda
      let serverMessage = '';
      try {
        const errBody = await response.json();
        serverMessage = errBody.message || errBody.error || '';
      } catch {
        // Le body n'est pas du JSON, ignorer
      }

      const error = new Error(
        `Erreur HTTP ${response.status}${serverMessage ? ` : ${serverMessage}` : ''}`
      );
      error.type = 'http';
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    requestCache.set(url, data);
    return data;

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      const error = new Error('La requête a pris trop de temps.');
      error.type = 'timeout';
      throw error;
    }

    if (err.type === 'http') {
      throw err;
    }

    // CORS, DNS, hors-ligne… Le message d'erreur fetch est cryptique en cas
    // de CORS — on l'humanise.
    const isCorsLike = err.message.includes('CORS') ||
                       err.message.includes('Failed to fetch') ||
                       err.message.includes('NetworkError');

    const error = new Error(
      isCorsLike
        ? 'Impossible de joindre l\'API OpenAgenda. Vérifiez votre connexion internet, ou utilisez un serveur HTTP local (les requêtes API ne fonctionnent pas en file://).'
        : `Erreur réseau : ${err.message}`
    );
    error.type = 'network';
    error.cause = err;
    throw error;
  }
}


// ----------------------------------------------------------------------------
// NORMALISATION DES DONNÉES
// ----------------------------------------------------------------------------

/**
 * Extrait la valeur d'un champ multilingue selon la langue préférée.
 * OpenAgenda renvoie souvent { fr: "...", en: "..." } ; on prend FR par défaut.
 */
export function pickLang(field, lang = API_CONFIG.preferredLang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    return field[lang] || field.fr || field.en || Object.values(field)[0] || '';
  }
  return String(field);
}

/**
 * Normalise un événement OpenAgenda en objet plat exploitable par l'UI.
 * Gère les champs absents et les variations de format entre agendas.
 */
export function normalizeEvent(raw) {
  const title = pickLang(raw.title);
  const description = pickLang(raw.description);
  const longDescription = pickLang(raw.longDescription) || pickLang(raw.description);

  // Première et dernière occurrence de timing
  const firstTiming = raw.timings?.[0] || raw.firstTiming || null;
  const lastTiming = raw.timings?.[raw.timings.length - 1] || raw.lastTiming || firstTiming;

  // Image — plusieurs formats possibles selon l'agenda OpenAgenda
  let imageUrl = '';
  let imageAlt = '';
  if (raw.image) {
    if (typeof raw.image === 'string') {
      imageUrl = raw.image;
    } else if (raw.image.variants?.length) {
      // OpenAgenda renvoie { variants: [{ filename, type, size: { width, height } }] }
      // où `type` peut être 'full' ou 'thumbnail'. On préfère la variante "full".
      const fullVariant = raw.image.variants.find(v => v.type === 'full');
      const variant = fullVariant || raw.image.variants[0];
      imageUrl = variant?.filename || '';
      // Le filename est relatif → préfixer avec base (ex: "https://cdn.openagenda.com/main/")
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('assets/') && raw.image.base) {
        imageUrl = raw.image.base + imageUrl;
      }
    } else if (raw.image.base && raw.image.filename) {
      imageUrl = raw.image.base + raw.image.filename;
    } else {
      imageUrl = raw.image.url || '';
    }
    imageAlt = pickLang(raw.image.credits) || pickLang(raw.imageCredits) || title;
  }

  const location = raw.location || {};
  const locationName = pickLang(location.name);
  const locationAddress = pickLang(location.address);
  const locationCity = pickLang(location.city);

  const conditions = pickLang(raw.conditions);
  const isFree = !conditions || /gratuit|free|libre|entrée libre/i.test(conditions);

  // Mots-clés : peuvent être un tableau ou un objet multilingue
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map(k => pickLang(k)).filter(Boolean)
    : (raw.keywords?.[API_CONFIG.preferredLang] || raw.keywords?.fr || []);

  return {
    uid: raw.uid,
    slug: raw.slug || `event-${raw.uid}`,
    title,
    description,
    longDescription,
    imageUrl,
    imageAlt,
    startDate: firstTiming?.begin || null,
    endDate: lastTiming?.end || null,
    timings: raw.timings || [],
    locationName,
    locationAddress,
    locationCity,
    conditions,
    isFree,
    keywords,
    raw,  // Donnée brute conservée au cas où
  };
}


// ----------------------------------------------------------------------------
// API PUBLIQUE
// ----------------------------------------------------------------------------

/**
 * Récupère la liste des événements.
 * En mode DÉMO, utilise sample-data.js. En mode RÉEL, appelle OpenAgenda
 * — sur TOUS les agendas configurés en parallèle, puis fusionne et trie.
 */
export async function fetchEvents({
  size = API_CONFIG.pageSize,
  after = null,
  relative = ['upcoming', 'ongoing'],
  search = null,
} = {}) {
  if (!isLiveMode()) {
    // Mode démo : données locales avec délai artificiel
    await new Promise(r => setTimeout(r, 300));
    const data = getSampleEventsList({ size, after, search });
    return {
      events: data.events.map(normalizeEvent),
      total: data.total,
      after: data.after,
    };
  }

  // ----- Mode RÉEL : agrégation multi-agendas -----
  // On interroge tous les agendas configurés en parallèle, puis on fusionne.
  // Stratégie : on demande `size` événements à CHAQUE agenda, on fusionne, on
  // dédoublonne, on trie par date, puis on garde les `size` premiers globalement.
  const validUids = getValidAgendaUids();

  const requests = validUids.map(uid => {
    const params = { size };
    if (relative?.length) params.relative = relative;
    if (search) params.search = search;
    // Note : la pagination `after` est désactivée en multi-agendas (chaque agenda
    // a son propre cursor). Pour des usages avancés on ferait du keyset par agenda.

    const url = buildUrl(`/agendas/${uid}/events`, params);
    return safeFetch(url)
      .then(data => ({ uid, data }))
      .catch(err => {
        // Si UN agenda plante, on continue avec les autres au lieu de tout casser.
        console.warn(`[VillaNova] Agenda ${uid} : ${err.message}`);
        return { uid, data: { events: [], total: 0 } };
      });
  });

  const responses = await Promise.all(requests);

  // Fusion des événements de tous les agendas
  const allEvents = responses.flatMap(r => r.data.events || []);
  const totalSum = responses.reduce((sum, r) => sum + (r.data.total || 0), 0);

  // Dédoublonnage par UID d'événement (au cas où plusieurs agendas partagent un event)
  const seenUids = new Set();
  const uniqueEvents = allEvents.filter(ev => {
    if (!ev.uid || seenUids.has(ev.uid)) return false;
    seenUids.add(ev.uid);
    return true;
  });

  // Normalisation puis tri par date de début (plus proche en premier)
  const normalizedEvents = uniqueEvents.map(normalizeEvent);
  normalizedEvents.sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  // On limite à `size` événements globalement (même si chaque agenda en a renvoyé plus)
  return {
    events: normalizedEvents.slice(0, size),
    total: totalSum,
    after: null,  // Pagination cumulative non triviale en multi-agendas, désactivée
  };
}

/**
 * Récupère un événement précis par son UID.
 * En mode RÉEL, on cherche dans tous les agendas configurés (404 silencieux
 * sur les agendas qui ne le contiennent pas).
 */
export async function fetchEventById(uid) {
  if (!uid) {
    const err = new Error('UID manquant');
    err.type = 'not-found';
    throw err;
  }

  if (!isLiveMode()) {
    await new Promise(r => setTimeout(r, 200));
    const data = getSampleEventById(uid);
    if (!data?.event) {
      const err = new Error('Événement introuvable');
      err.type = 'not-found';
      throw err;
    }
    return normalizeEvent(data.event);
  }

  // Mode réel : essayer chaque agenda jusqu'à trouver l'événement
  const validUids = getValidAgendaUids();
  for (const agendaUid of validUids) {
    const url = buildUrl(`/agendas/${agendaUid}/events/${uid}`);
    try {
      const data = await safeFetch(url);
      if (data?.event) {
        return normalizeEvent(data.event);
      }
    } catch (err) {
      // 404 attendu sur les agendas qui ne contiennent pas cet événement
      if (err.status !== 404) {
        console.warn(`[VillaNova] Agenda ${agendaUid} :`, err.message);
      }
    }
  }

  const err = new Error('Événement introuvable dans les agendas configurés');
  err.type = 'not-found';
  throw err;
}

/**
 * Récupère un événement "à la une" (le premier upcoming par défaut).
 */
export async function fetchFeaturedEvent() {
  const { events } = await fetchEvents({
    size: API_CONFIG.featuredSize,
    relative: ['upcoming'],
  });
  return events[0] || null;
}

/**
 * Vide le cache (utile après une action utilisateur "Actualiser").
 */
export function clearCache() {
  requestCache.clear();
}
