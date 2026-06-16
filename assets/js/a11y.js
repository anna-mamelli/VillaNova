/**
 * VillaNova · a11y.js
 * ============================================================================
 * Référence WCAG 2.1 AA + RGAA 4.1.
 * ============================================================================
 */


// ----------------------------------------------------------------------------
// LIVE REGION — Annonces aux lecteurs d'écran
// ----------------------------------------------------------------------------

/**
 * Une "live region" est une zone du DOM dont les changements sont annoncés
 * automatiquement par le lecteur d'écran. Critère essentiel WCAG 4.1.3.
 *
 * Sans live region, le lecteur d'écran ne dit RIEN quand le DOM change
 * dynamiquement → l'utilisateur aveugle ne sait pas que sa recherche a abouti.
 *
 * On utilise deux régions distinctes :
 *  - role="status" + aria-live="polite" : annonces non urgentes (résultats)
 *  - role="alert" + aria-live="assertive" : annonces urgentes (erreurs)
 */

let politeRegion = null;
let assertiveRegion = null;

/**
 * Crée (une seule fois) les live regions et les ajoute au body.
 * Visuellement cachées mais accessibles aux lecteurs d'écran.
 */
function ensureLiveRegions() {
  if (politeRegion && assertiveRegion) return;

  // Région polite (status)
  politeRegion = document.createElement('div');
  politeRegion.setAttribute('role', 'status');
  politeRegion.setAttribute('aria-live', 'polite');
  politeRegion.setAttribute('aria-atomic', 'true');
  politeRegion.className = 'sr-only';
  politeRegion.id = 'a11y-polite-region';
  document.body.appendChild(politeRegion);

  // Région assertive (alert)
  assertiveRegion = document.createElement('div');
  assertiveRegion.setAttribute('role', 'alert');
  assertiveRegion.setAttribute('aria-live', 'assertive');
  assertiveRegion.setAttribute('aria-atomic', 'true');
  assertiveRegion.className = 'sr-only';
  assertiveRegion.id = 'a11y-assertive-region';
  document.body.appendChild(assertiveRegion);
}

/**
 * Annonce un message non urgent (statut).
 * @param {string} message
 */
export function announce(message) {
  ensureLiveRegions();

  // Astuce : vider la région avant de la remplir, sinon les lecteurs d'écran
  // peuvent ignorer un message identique au précédent.
  politeRegion.textContent = '';
  setTimeout(() => {
    politeRegion.textContent = message;
  }, 50);
}

/**
 * Annonce un message URGENT (erreur). Interrompt la lecture en cours.
 * À utiliser avec parcimonie — sinon l'utilisateur est constamment interrompu.
 * @param {string} message
 */
export function announceUrgent(message) {
  ensureLiveRegions();
  assertiveRegion.textContent = '';
  setTimeout(() => {
    assertiveRegion.textContent = message;
  }, 50);
}


// ----------------------------------------------------------------------------
// FOCUS MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * Déplace le focus sur un élément en s'assurant qu'il est focusable.
 * Si l'élément n'est pas naturellement focusable (div, section…), on lui
 * ajoute tabindex="-1" temporairement.
 *
 * Cas d'usage : après un fetch réussi, focuser sur le titre des résultats
 * pour que le lecteur d'écran l'annonce et que l'utilisateur clavier
 * continue depuis le bon endroit.
 *
 * @param {Element|string} target - Élément ou sélecteur
 * @param {Object} [options]
 * @param {boolean} [options.preventScroll] - Ne pas scroller (par défaut on scrolle)
 */
export function moveFocusTo(target, { preventScroll = false } = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return false;

  // Forcer focusabilité si nécessaire
  const naturallyFocusable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
  if (!naturallyFocusable && !el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }

  el.focus({ preventScroll });
  return true;
}


// ----------------------------------------------------------------------------
// ARIA STATES — États interactifs
// ----------------------------------------------------------------------------

/**
 * Marque un élément comme "occupé" pendant un chargement.
 * Le lecteur d'écran annonce "occupé" et l'utilisateur attend.
 *
 * @param {Element} el
 * @param {boolean} busy
 */
export function setBusy(el, busy = true) {
  if (!el) return;
  el.setAttribute('aria-busy', busy ? 'true' : 'false');
}

/**
 * Met à jour aria-current sur un groupe d'éléments (filtres, pagination).
 * S'assure qu'UN SEUL élément a aria-current à la fois.
 *
 * @param {Element} container - Parent qui contient les liens/boutons
 * @param {Element} activeEl - Élément à marquer comme actif
 * @param {string} [value='page'] - Valeur d'aria-current (page|step|location|true)
 */
export function setActiveAriaCurrent(container, activeEl, value = 'true') {
  if (!container) return;

  // Retirer aria-current des autres
  container.querySelectorAll('[aria-current]').forEach(el => {
    el.removeAttribute('aria-current');
  });

  // Appliquer au nouveau
  if (activeEl) {
    activeEl.setAttribute('aria-current', value);
  }
}


// ----------------------------------------------------------------------------
// HELPER : sr-only (CSS injecté si pas déjà présent dans la feuille)
// ----------------------------------------------------------------------------

/**
 * S'assure que la classe .sr-only existe dans la feuille de style.
 * (Normalement déjà définie via le mixin SASS visually-hidden, mais on
 * sécurise au cas où le JS soit chargé sans le CSS.)
 */
(function injectSrOnlyCSS() {
  if (document.getElementById('vn-a11y-sr-only')) return;

  const style = document.createElement('style');
  style.id = 'vn-a11y-sr-only';
  style.textContent = `
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
  `;
  document.head.appendChild(style);
})();


// ----------------------------------------------------------------------------
// MESSAGES D'ERREUR HUMAINS
// ----------------------------------------------------------------------------

/**
 * Convertit une erreur technique en message compréhensible pour un humain.
 * Critère WCAG 3.3.1 : "Les erreurs sont identifiées et décrites en texte."
 *
 * @param {Error} err
 * @returns {{title: string, message: string, action?: string}}
 */
export function humanizeError(err) {
  if (err.type === 'timeout') {
    return {
      title: 'Le chargement prend trop de temps',
      message: 'Le serveur met du temps à répondre. Vérifiez votre connexion internet.',
      action: 'Réessayer',
    };
  }

  if (err.type === 'network') {
    return {
      title: 'Connexion impossible',
      message: 'Nous ne pouvons pas joindre le serveur. Êtes-vous bien connecté à internet ?',
      action: 'Réessayer',
    };
  }

  if (err.type === 'http') {
    if (err.status === 401 || err.status === 403) {
      return {
        title: 'Accès refusé',
        message: 'La clé d\'accès à l\'API est invalide ou a expiré. Contactez le support.',
      };
    }
    if (err.status === 404) {
      return {
        title: 'Ressource introuvable',
        message: 'L\'événement demandé n\'existe pas ou a été supprimé.',
      };
    }
    if (err.status >= 500) {
      return {
        title: 'Le serveur rencontre des difficultés',
        message: 'Nous travaillons à résoudre le problème. Réessayez dans quelques minutes.',
        action: 'Réessayer',
      };
    }
  }

  if (err.type === 'not-found') {
    return {
      title: 'Événement introuvable',
      message: 'L\'événement demandé n\'existe pas ou a été retiré.',
    };
  }

  return {
    title: 'Une erreur inattendue est survenue',
    message: err.message || 'Veuillez réessayer plus tard.',
    action: 'Réessayer',
  };
}
