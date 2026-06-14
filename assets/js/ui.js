/**
 * VillaNova · ui.js
 * ============================================================================
 * Fonctions de création DOM pour les cartes d'événements et états UI.
 *
 * SÉCURITÉ : on utilise createElement() + textContent, JAMAIS innerHTML
 * pour les données provenant de l'API. C'est la défense contre les attaques
 * XSS (Cross-Site Scripting) — un titre malicieux <script>alert(1)</script>
 * serait exécuté avec innerHTML, mais affiché tel quel avec textContent.
 *
 * Référence OWASP : https://owasp.org/www-community/attacks/xss/
 * ============================================================================
 */

import { humanizeError } from './a11y.js';


// ----------------------------------------------------------------------------
// FORMATAGE DES DATES
// ----------------------------------------------------------------------------

/**
 * Formate une date ISO 8601 en chaîne lisible française.
 *
 * @param {string} isoDate
 * @param {Object} [options]
 * @param {boolean} [options.withTime] - Inclure l'heure
 * @returns {string}
 */
export function formatDate(isoDate, { withTime = false } = {}) {
  if (!isoDate) return '';

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';

    const dateOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    if (withTime) {
      dateOptions.hour = '2-digit';
      dateOptions.minute = '2-digit';
    }

    return new Intl.DateTimeFormat('fr-FR', dateOptions).format(date);
  } catch {
    return '';
  }
}

/**
 * Date courte au format "JJ MMM" pour les badges sticker (ex: "26 AVR").
 * @param {string} isoDate
 * @returns {string}
 */
export function formatBadgeDate(isoDate) {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
    return `${day} ${months[date.getMonth()]}`;
  } catch {
    return '';
  }
}


// ----------------------------------------------------------------------------
// CRÉATION DOM — Helpers
// ----------------------------------------------------------------------------

/**
 * Crée un élément avec attributs et enfants.
 * Évite l'innerHTML pour les données utilisateur.
 *
 * @param {string} tag - Nom de tag (div, h3, p, a, etc.)
 * @param {Object} [attrs] - Attributs et propriétés
 * @param {Array<Node|string>} [children] - Enfants (Node ou texte)
 * @returns {HTMLElement}
 *
 * Exemple :
 *   el('h3', { class: 'card-title' }, [
 *     el('a', { href: '/event/42' }, ['Mon titre'])
 *   ])
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;

    if (key === 'class' || key === 'className') {
      node.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([k, v]) => { node.dataset[k] = v; });
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Event listener (onClick, onSubmit, etc.)
      node.addEventListener(key.substring(2).toLowerCase(), value);
    } else if (key === 'aria' && typeof value === 'object') {
      // Raccourci aria: { label: '...', current: 'page' }
      Object.entries(value).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== false) {
          node.setAttribute(`aria-${k}`, v);
        }
      });
    } else {
      node.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }

  return node;
}


// ----------------------------------------------------------------------------
// CARTES ÉVÉNEMENT
// ----------------------------------------------------------------------------

/**
 * Crée une carte d'événement (utilisée dans la liste de l'index et l'aside
 * "Vous aimerez aussi" de la fiche détail).
 *
 * @param {Object} event - Événement normalisé (cf. api.js)
 * @returns {HTMLElement} <article>
 */
export function createEventCard(event) {
  const dateBadge = formatBadgeDate(event.startDate);
  const detailUrl = `event-detail.html?id=${encodeURIComponent(event.uid)}`;

  const picture = event.imageUrl
    ? el('picture', dateBadge ? { 'data-date': dateBadge } : {}, [
        el('img', {
          src: event.imageUrl,
          alt: event.imageAlt || event.title,
          width: '400',
          height: '250',
          loading: 'lazy',
          decoding: 'async',
        }),
      ])
    : el('picture', dateBadge ? { 'data-date': dateBadge } : {}, [
        // Placeholder visuel si pas d'image (reste accessible)
        el('div', {
          class: 'card-image-placeholder',
          'aria-hidden': 'true',
          style: 'aspect-ratio:16/10;background:linear-gradient(135deg,#7C3AED,#2E1065);width:100%;',
        }, []),
      ]);

  return el('article', {}, [
    picture,
    el('h3', {}, [
      el('a', { href: detailUrl }, [event.title || 'Événement sans titre']),
    ]),
    event.startDate
      ? el('p', {}, [
          el('time', { datetime: event.startDate }, [formatDate(event.startDate, { withTime: true })]),
        ])
      : null,
    event.locationName
      ? el('p', {}, [event.locationName])
      : null,
  ].filter(Boolean));
}


// ----------------------------------------------------------------------------
// ÉTATS UI : loading, empty, error
// ----------------------------------------------------------------------------

/**
 * Crée un placeholder de chargement (squelette de carte).
 * Pendant le fetch, on affiche 6 squelettes pour que l'utilisateur
 * visualise la structure à venir → bénéfice UX et perception de rapidité.
 *
 * @param {number} count
 * @returns {HTMLElement[]}
 */
export function createLoadingSkeletons(count = 6) {
  return Array.from({ length: count }, () =>
    el('article', {
      class: 'card-skeleton',
      'aria-hidden': 'true',
      style: `
        background: white;
        border: 2px solid #C4B5FD;
        border-radius: 0.625rem;
        overflow: hidden;
        height: 360px;
        animation: pulse 1.5s ease-in-out infinite;
      `,
    }, [
      el('div', { style: 'aspect-ratio:16/10;background:#EDE9FE;' }, []),
      el('div', { style: 'padding:1rem;' }, [
        el('div', { style: 'height:1.2rem;background:#EDE9FE;border-radius:4px;width:80%;margin-bottom:0.5rem;' }, []),
        el('div', { style: 'height:0.8rem;background:#EDE9FE;border-radius:4px;width:60%;' }, []),
      ]),
    ])
  );
}

/**
 * Injecte le CSS de l'animation pulse (une fois) pour les squelettes.
 */
(function injectSkeletonCSS() {
  if (document.getElementById('vn-skeleton-css')) return;
  const style = document.createElement('style');
  style.id = 'vn-skeleton-css';
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    @media (prefers-reduced-motion: reduce) {
      .card-skeleton { animation: none !important; opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);
})();

/**
 * Crée un message "Aucun résultat".
 * @param {string} [searchTerm] - Pour personnaliser le message
 * @returns {HTMLElement}
 */
export function createEmptyState(searchTerm = null) {
  return el('div', {
    class: 'empty-state',
    role: 'status',
    style: 'padding:3rem 1rem;text-align:center;color:#6D5B9F;',
  }, [
    el('p', { style: 'font-size:1.25rem;font-weight:600;margin-bottom:0.5rem;color:#2E1065;' }, [
      searchTerm
        ? `Aucun résultat pour « ${searchTerm} »`
        : 'Aucun événement à afficher',
    ]),
    el('p', {}, [
      searchTerm
        ? 'Essayez avec d\'autres mots-clés ou modifiez les filtres actifs.'
        : 'Revenez bientôt — de nouveaux événements sont publiés régulièrement.',
    ]),
  ]);
}

/**
 * Crée un message d'erreur avec bouton "Réessayer".
 * @param {Error} error
 * @param {Function} [onRetry] - Callback du clic Réessayer
 * @returns {HTMLElement}
 */
export function createErrorState(error, onRetry = null) {
  const human = humanizeError(error);

  const children = [
    el('p', {
      style: 'font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;color:#BE185D;',
    }, [human.title]),
    el('p', { style: 'margin-bottom:1rem;' }, [human.message]),
  ];

  if (human.action && onRetry) {
    children.push(
      el('button', {
        type: 'button',
        class: 'vn-btn-primary',
        onClick: onRetry,
      }, [human.action])
    );
  }

  return el('div', {
    class: 'error-state',
    role: 'alert',
    style: 'padding:2rem 1rem;text-align:center;background:#FEF3C7;border:2px solid #FBBF24;border-radius:1rem;color:#78350F;',
  }, children);
}


// ----------------------------------------------------------------------------
// HELPERS DOM
// ----------------------------------------------------------------------------

/**
 * Vide un conteneur (plus rapide que innerHTML = '').
 * @param {Element} container
 */
export function clearChildren(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

/**
 * Remplace le contenu d'un conteneur par de nouveaux éléments.
 * @param {Element} container
 * @param {Node|Node[]} newContent
 */
export function replaceContent(container, newContent) {
  clearChildren(container);
  const nodes = Array.isArray(newContent) ? newContent : [newContent];
  nodes.forEach(n => n && container.appendChild(n));
}
