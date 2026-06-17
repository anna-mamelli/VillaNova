# VillaNova

> Plateforme événementielle municipale fictive - projet pédagogique du **Bloc 2 de la certification Développeur Full Stack** (RNCP).

Centraliser la programmation culturelle d'une ville fictive, dans le respect des standards d'un service public : accessibilité RGAA AA, éco-conception RGESN, sécurité OWASP, RGPD.

## Stack technique

Projet **frontend vanilla** (sans framework) pour démontrer la maîtrise des fondamentaux web :

- **HTML5** sémantique avec microdonnées Schema.org Event
- **SCSS** modulaire (5 partials, architecture inspirée ITCSS)
- **JavaScript ES modules** natifs (6 modules à responsabilité unique)
- **API tierce** OpenAgenda (3 agendas Marseille agrégés en parallèle)
- **localStorage** comme backend simulé pour le CRUD réservations

## Fonctionnalités

- Page d'accueil avec recherche, filtres par catégorie, événement à la une, pagination
- Fiche détail d'événement avec breadcrumb, infos pratiques, vidéo de promo (3 pistes VTT)
- CRUD complet sur les réservations (GET / POST / PATCH / DELETE)
- Multi-agendas avec dédoublonnage et résilience (1 agenda en panne = les autres continuent)
- Mode démo automatique avec 12 événements fictifs (si l'API n'est pas configurée)

## Compétences Bloc 2 démontrées

| Axe | Compétence | Où la voir |
|---|---|---|
| **Conception** | Maquettes Lo-Fi → Hi-Fi, design system, modélisation UML | `scss/_variables.scss`, deck |
| **Front-end** | HTML sémantique, SCSS modulaire, JS ES modules | `index.html`, `scss/`, `assets/js/` |
| **API** | Multi-agendas OpenAgenda, Promise.all, normalisation | `assets/js/api.js` |
| **REST** | CRUD complet avec wrapper apiRequest unifié | `assets/js/event-detail.js` |
| **Accessibilité** | WCAG AA (contrastes), aria-live, skip-link, focus | `assets/js/a11y.js`, `scss/_utilities.scss` |
| **RGPD** | Consentement explicite, droit à l'effacement, minimisation | Formulaire réservation |
| **Éco-conception** | AVIF/WebP/JPG, lazy loading, < 500 Ko/page | `<picture>` dans HTML |
| **Sécurité** | Protection XSS (textContent), erreurs typifiées | `assets/js/api.js`, `assets/js/a11y.js` |
| **Robustesse** | 5 types d'erreurs gérées avec messages humanisés | `assets/js/a11y.js` |

## Installation

### Prérequis
- Un navigateur moderne (Chrome 90+, Firefox 88+, Safari 14+)
- Python 3 ou un serveur statique local (Live Server VS Code, http-server, etc.)

### Lancement local

```bash
# Cloner le dépôt
git clone https://github.com/anna-mamelli/villanova.git
cd villanova

# Lancer un serveur HTTP local
python3 -m http.server 8000

# Ouvrir dans le navigateur
# http://localhost:8000
```

Alternative avec VS Code :
1. Installer l'extension **Live Server**
2. Clic droit sur `index.html` → **Open with Live Server**
3. Le site s'ouvre sur `http://localhost:5500`

### Configuration OpenAgenda (optionnelle)

Par défaut, le projet fonctionne en **mode démo** avec 12 événements fictifs.

Pour utiliser la **vraie API OpenAgenda** :
1. Créer un compte gratuit sur [openagenda.com](https://openagenda.com)
2. Récupérer une clé API publique
3. Dans `assets/js/api.js`, remplacer la valeur de `API_KEY` :

```js
const API_KEY = 'la-clé-publique';
```

## Architecture

```
villanova/
├── index.html                  # Page d'accueil
├── event-detail.html           # Fiche détail événement
├── assets/
│   ├── images/                 # AVIF + WebP + JPG (triple format)
│   ├── videos/                 # WebM + MP4 + pistes VTT
│   └── js/
│       ├── api.js              # Communication OpenAgenda + CRUD
│       ├── sample-data.js      # 12 événements fictifs (mode démo)
│       ├── ui.js               # Création DOM + formatage Intl
│       ├── a11y.js             # Live regions + focus + humanizeError
│       ├── index.js            # Entrée page d'accueil
│       └── event-detail.js     # Entrée fiche détail + CRUD réservations
├── scss/                       # Sources SCSS (compilées vers css/style.css)
│   ├── _variables.scss         # Palette + breakpoints
│   ├── _mixins.scss            # respond-to() mobile-first
│   ├── _base.scss              # Reset + typographie de base
│   ├── _components.scss        # Cards + boutons + formulaires
│   ├── _utilities.scss         # sr-only + skip-link
│   └── style.scss              # Entry point qui importe les 5 partials
└── css/
    └── style.css               # CSS compilé final servi au navigateur
```

## Modélisation des données

```
┌──────────────────┐  1     0..N  ┌────────────────────┐
│      Event       │ ─────────────│   Reservation      │
├──────────────────┤              ├────────────────────┤
│ + uid            │              │ + id (PK)          │
│ + title          │              │ + eventId (FK)     │
│ + description    │              │ + prenom · nom     │
│ + startDate      │              │ + email · phone    │
│ + locationName   │              │ + jours[]          │
│ + isFree         │              │ + accessibilite    │
│ + keywords[]     │              │ + createdAt        │
└──────────────────┘              └────────────────────┘
```

## Conformité

### Accessibilité WCAG / RGAA AA
- Contrastes audités : texte principal 14.78:1 (AAA), liens 8.71:1 (AAA)
- Skip-link, focus visible (3px), aria-live polite + assertive
- prefers-reduced-motion respecté
- Vidéo avec sous-titres FR + EN + audiodescription FR

### Éco-conception RGESN
- ~500 Ko par chargement de page (5x moins que la moyenne web)
- Images triple format AVIF + WebP + JPG (jusqu'à -76% sur le poids)
- Lazy loading sous la ligne de flottaison
- Aucun tracker, aucun cookie tiers
- JS modules ES = defer natif (non-bloquant)

### RGPD
- Consentement explicite (case décochée par défaut)
- Minimisation des données (uniquement le nécessaire)
- Droit à l'effacement : bouton DELETE complet (pas de softdelete)
- Droit de rectification : bouton PATCH

## Limites et perspectives

Le projet est volontairement frontend pour respecter le brief. Évolutions identifiées :

1. **Backend Node.js Express** comme proxy OpenAgenda (résout CORS, protège la clé)
2. **Polices auto-hébergées** au lieu de Google Fonts (performance + RGPD)
3. **Tests automatisés** Playwright (E2E) + Jest (unitaires) en CI
4. **Critical CSS inline** pour améliorer le First Contentful Paint
5. **PWA / Service Worker** pour le mode hors-ligne et notifications push

## Licence

Projet pédagogique. Code disponible sous licence MIT.

## Auteur

**Anna Mamelli**
Bachelor ASR - La Plateforme_ Marseille
<<<<<<< HEAD
Certification Développeur Full Stack - Bloc 2
=======
Certification Développeur Full Stack - Bloc 2
>>>>>>> 76e12cbc16bbb271a0b0fe9953cc9d6909075004
Juin 2026
