/**
 * VillaNova · sample-data.js
 * ============================================================================
 * Données d'exemple pour le mode DÉMO.
 *
 * Ces événements fictifs sont utilisés quand la clé API OpenAgenda n'a pas
 * encore été configurée. Ils permettent de présenter le projet sans avoir
 * besoin d'un compte OpenAgenda.
 *
 * Format identique à celui que retournerait l'API OpenAgenda v2 — comme ça
 * le code de api.js / ui.js fonctionne exactement de la même manière dans
 * les deux modes.
 *
 * Pour passer en mode RÉEL : modifier api.js avec votre clé publique et
 * l'UID de votre agenda OpenAgenda. Voir JOUR04-defense.md.
 * ============================================================================
 */

const ASSET_BASE = 'assets/images';

/**
 * Génère un timing OpenAgenda standard (begin + end)
 */
function timing(beginISO, durationHours = 3) {
  const begin = new Date(beginISO);
  const end = new Date(begin.getTime() + durationHours * 3600 * 1000);
  return [{
    begin: begin.toISOString(),
    end: end.toISOString(),
  }];
}

/**
 * Liste de 12 événements de démo, format OpenAgenda v2.
 * Date de référence : à partir de mai 2026.
 */
export const SAMPLE_EVENTS = [
  {
    uid: 1001,
    slug: 'festival-cultures-urbaines',
    title: { fr: 'Festival des cultures urbaines' },
    description: {
      fr: 'Trois jours pour célébrer les cultures urbaines au Vieux-Port : musique, danse, arts visuels et débats. Plus de 80 artistes locaux et internationaux. Entrée libre.',
    },
    longDescription: {
      fr: 'Trois jours pour faire vibrer les cultures urbaines au cœur du Vieux-Port : musique, danse, arts visuels, débats et ateliers participatifs. Le festival rassemble plus de 80 artistes locaux et internationaux pour une programmation pluridisciplinaire qui célèbre l\'énergie de la jeunesse de VillaNova.\n\nConcerts hip-hop, battles de danse, fresques live, projections de documentaires, conférences sur les enjeux urbains, ateliers de DJing et de graffiti pour les jeunes — tout est gratuit, accessible, et conçu pour favoriser les rencontres entre publics qui ne se croisent pas habituellement.\n\nLe festival s\'inscrit dans la démarche éco-citoyenne de la ville : éclairage LED basse consommation, gobelets consignés, partenariat avec les transports en commun.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/festival-cultures-urbaines-1280.jpg` }] },
    timings: timing('2026-05-15T14:00:00+02:00', 9),
    location: {
      name: 'Vieux-Port',
      address: 'Quai des Belges, 13001 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['festival', 'éco-responsable', 'tout public'] },
    conditions: { fr: 'Entrée libre · Inscription recommandée' },
  },
  {
    uid: 1002,
    slug: 'nuit-indie-rock',
    title: { fr: 'Nuit Indie Rock' },
    description: {
      fr: 'Soirée concert de groupes émergents marseillais et lyonnais. Quatre groupes en plateau, ambiance club intimiste.',
    },
    longDescription: {
      fr: 'Quatre groupes émergents de la scène indie rock française se succèdent sur la scène du Molotov pour une nuit électrique. Au programme : The Pinkerton, Méridienne, Studio Bricabrac et l\'invité surprise du mois.\n\nLe Molotov est l\'un des spots les plus mythiques de la scène alternative marseillaise, qui programme depuis 1995 les meilleures pépites de la scène indé.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/nuit-indie-rock-800.jpg` }] },
    timings: timing('2026-05-20T21:00:00+02:00', 4),
    location: {
      name: 'Le Molotov',
      address: '3 Place Paul Cézanne, 13006 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['concert', 'rock', 'club'] },
    conditions: { fr: '12€ en prévente · 15€ sur place' },
  },
  {
    uid: 1003,
    slug: 'lumieres-archive',
    title: { fr: 'Lumières d\'archive' },
    description: {
      fr: 'Exposition de photographies historiques de VillaNova entre 1900 et 1950. Plus de 200 clichés issus des archives municipales.',
    },
    longDescription: {
      fr: 'Le Musée d\'Histoire ouvre exceptionnellement ses fonds d\'archives photographiques, longtemps restés cachés. Une plongée dans la VillaNova du début du XXe siècle : les quartiers populaires, les marchés, les ports, les fêtes religieuses, le travail à l\'usine.\n\nL\'exposition est accompagnée d\'un parcours sonore — témoignages d\'habitants enregistrés dans les années 80, qui décrivent la ville de leur enfance.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/lumieres-archive-800.jpg` }] },
    timings: timing('2026-05-22T10:00:00+02:00', 8),
    location: {
      name: 'Musée d\'Histoire',
      address: '2 Rue Henri Barbusse, 13001 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['exposition', 'patrimoine', 'photographie'] },
    conditions: { fr: '5€ · Gratuit pour les habitants de VillaNova' },
  },
  {
    uid: 1004,
    slug: 'romeo-juliette',
    title: { fr: 'Roméo & Juliette' },
    description: {
      fr: 'Adaptation contemporaine de la tragédie de Shakespeare par la compagnie Théâtre du Réel. Mise en scène moderne au Théâtre du Gymnase.',
    },
    longDescription: {
      fr: 'La compagnie Théâtre du Réel revisite la tragédie de Shakespeare dans une mise en scène résolument contemporaine. Costumes d\'aujourd\'hui, langage modernisé tout en respectant la versification originale.\n\nUne production saluée par la critique, programmée dans une dizaine de scènes nationales en 2025-2026.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/romeo-juliette-800.jpg` }] },
    timings: timing('2026-05-25T19:30:00+02:00', 2.5),
    location: {
      name: 'Théâtre du Gymnase',
      address: '4 Rue du Théâtre Français, 13001 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['théâtre', 'classique', 'tout public'] },
    conditions: { fr: '22€ tarif plein · 14€ tarif réduit' },
  },
  {
    uid: 1005,
    slug: 'cinema-plein-air',
    title: { fr: 'Cinéma plein air : Amélie Poulain' },
    description: {
      fr: 'Projection en plein air du film de Jean-Pierre Jeunet sur les pelouses du Parc Borély. Apportez votre couverture !',
    },
    longDescription: {
      fr: 'Pour la 12e saison consécutive, le Parc Borély se transforme en cinéma à ciel ouvert. La projection démarre à la tombée de la nuit, vers 21h30. Apportez plaids, coussins et pique-niques.\n\nUn food truck local sera sur place dès 19h pour les petits creux. Boissons sans alcool uniquement (réglementation municipale).',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/cinema-plein-air-800.jpg` }] },
    timings: timing('2026-06-02T21:30:00+02:00', 2.5),
    location: {
      name: 'Parc Borély',
      address: 'Avenue du Prado, 13008 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['cinéma', 'famille', 'gratuit'] },
    conditions: { fr: 'Gratuit · Sans réservation' },
  },
  {
    uid: 1006,
    slug: 'atelier-ceramique',
    title: { fr: 'Atelier céramique débutant' },
    description: {
      fr: 'Initiation à la poterie sur tour, par la céramiste Léa Marchand. Tous niveaux. Limité à 8 personnes.',
    },
    longDescription: {
      fr: 'Léa Marchand, céramiste installée à La Friche depuis 12 ans, vous initie à la poterie sur tour. Vous repartirez avec une pièce que vous aurez façonnée vous-même (cuisson au four 2 semaines plus tard).\n\nMatériel fourni. Tablier conseillé.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/atelier-ceramique-800.jpg` }] },
    timings: timing('2026-06-04T14:00:00+02:00', 3),
    location: {
      name: 'La Friche Belle de Mai',
      address: '41 Rue Jobin, 13003 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['atelier', 'céramique', 'famille'] },
    conditions: { fr: '35€ matériel inclus · Tarif réduit étudiants 25€' },
  },
  {
    uid: 1007,
    slug: 'concert-electro',
    title: { fr: 'Soirée électro : Boiler Room' },
    description: {
      fr: 'Trois DJs marseillais et internationaux pour une nuit électro intense. Boiler Room signature au Cabaret Aléatoire.',
    },
    longDescription: {
      fr: 'Le Cabaret Aléatoire programme sa soirée Boiler Room mensuelle avec un line-up exceptionnel : Adèle Castillon (Paris), Toko Hisuda (Tokyo via Berlin) et le local DJ Massil. Ambiance club intimiste, sound system XL.\n\nVidéo enregistrée diffusée en streaming sur la chaîne Boiler Room internationale.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/concert-electro-800.jpg` }] },
    timings: timing('2026-06-08T22:00:00+02:00', 6),
    location: {
      name: 'Cabaret Aléatoire',
      address: '41 Rue Jobin, 13003 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['concert', 'électro', 'club', 'public 18-35'] },
    conditions: { fr: '18€ en prévente · 25€ sur place' },
  },
  {
    uid: 1008,
    slug: 'visite-quartier-panier',
    title: { fr: 'Visite guidée : Le Panier hier et aujourd\'hui' },
    description: {
      fr: 'Balade commentée par une guide-conférencière dans le plus ancien quartier de VillaNova. 2h, départ Place de Lenche.',
    },
    longDescription: {
      fr: 'Une plongée dans 2600 ans d\'histoire urbaine, depuis la fondation grecque jusqu\'à la rénovation contemporaine. Anecdotes, archives, rencontres avec des habitants.\n\nGuide : Sophie Aubert, conférencière nationale agréée Ministère de la Culture.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/lumieres-archive-800.jpg` }] },
    timings: timing('2026-06-12T10:00:00+02:00', 2),
    location: {
      name: 'Place de Lenche',
      address: 'Place de Lenche, 13002 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['visite', 'patrimoine', 'famille'] },
    conditions: { fr: '12€ tarif unique · Gratuit -12 ans' },
  },
  {
    uid: 1009,
    slug: 'jazz-cinq-continents',
    title: { fr: 'Festival Jazz des 5 Continents' },
    description: {
      fr: 'Festival de jazz international, 18e édition. Têtes d\'affiche annoncées prochainement. Palais Longchamp.',
    },
    longDescription: {
      fr: 'Le festival emblématique de la scène jazz française revient pour sa 18e édition au cadre exceptionnel du Palais Longchamp. 9 soirées, 18 concerts, 5 continents représentés.\n\nLine-up complet annoncé en avril 2026.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/festival-cultures-urbaines-800.jpg` }] },
    timings: timing('2026-07-15T20:00:00+02:00', 4),
    location: {
      name: 'Palais Longchamp',
      address: 'Boulevard du Jardin Zoologique, 13004 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['festival', 'jazz', 'concert'] },
    conditions: { fr: '32€ pass soirée · 195€ pass 9 jours' },
  },
  {
    uid: 1010,
    slug: 'expo-mer-mediterranee',
    title: { fr: 'La Mer en Méditerranée' },
    description: {
      fr: 'Exposition photographique sur la pêche traditionnelle méditerranéenne. Photos primées au World Press Photo 2025.',
    },
    longDescription: {
      fr: 'Le photoreporter Paolo Pellegrin présente 80 photographies prises entre 2020 et 2024 sur les côtes méditerranéennes : pêcheurs italiens, tunisiens, libanais, grecs, marseillais. Une réflexion sur les métiers menacés et l\'écosystème marin.\n\nVernissage gratuit le 18 juin à 19h en présence du photographe.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/lumieres-archive-1280.jpg` }] },
    timings: timing('2026-06-18T10:00:00+02:00', 8),
    location: {
      name: 'Mucem',
      address: '7 Promenade Robert Laffont, 13002 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['exposition', 'photographie', 'méditerranée'] },
    conditions: { fr: '11€ tarif plein · Gratuit -26 ans' },
  },
  {
    uid: 1011,
    slug: 'theatre-jeune-public',
    title: { fr: 'Le Petit Prince — version théâtrale' },
    description: {
      fr: 'Adaptation jeune public du chef-d\'œuvre de Saint-Exupéry. Marionnettes géantes, musique live. Dès 6 ans.',
    },
    longDescription: {
      fr: 'La compagnie Mille Bras transpose Le Petit Prince dans un univers de marionnettes géantes et de musique live (violoncelle, accordéon, voix). Spectacle créé en 2023, plus de 200 représentations dans toute la France.\n\nDurée : 1h, sans entracte.',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/romeo-juliette-800.jpg` }] },
    timings: timing('2026-06-21T16:00:00+02:00', 1),
    location: {
      name: 'Théâtre Massalia',
      address: '41 Rue Jobin, 13003 VillaNova',
      city: 'VillaNova',
    },
    keywords: { fr: ['théâtre', 'jeune public', 'famille'] },
    conditions: { fr: '8€ enfant · 15€ adulte' },
  },
  {
    uid: 1012,
    slug: 'fete-musique',
    title: { fr: 'Fête de la Musique' },
    description: {
      fr: 'Plus de 80 scènes ouvertes dans toute la ville. Programmation complète sur villanova.fr/fete-musique.',
    },
    longDescription: {
      fr: 'La 44e édition de la Fête de la Musique s\'annonce exceptionnelle : 80 scènes réparties dans tous les quartiers, 300 musiciens amateurs et professionnels, jusqu\'à minuit.\n\nScènes phares : Vieux-Port (jazz), Cours Julien (rock indie), La Plaine (électro), Notre-Dame du Mont (chorale et musique sacrée).',
    },
    image: { variants: [{ filename: `${ASSET_BASE}/concert-electro-1280.jpg` }] },
    timings: timing('2026-06-21T18:00:00+02:00', 6),
    location: {
      name: 'Toute la ville',
      address: 'Centre-ville et tous les quartiers',
      city: 'VillaNova',
    },
    keywords: { fr: ['festival', 'gratuit', 'tout public'] },
    conditions: { fr: 'Gratuit · Sans réservation' },
  },
];

/**
 * Simule la réponse de l'endpoint /agendas/{uid}/events
 * @param {Object} options - { size, after, search }
 * @returns {Object} Format identique à la vraie API OpenAgenda
 */
export function getSampleEventsList({ size = 12, after = null, search = null } = {}) {
  let events = [...SAMPLE_EVENTS];

  // Filtrage par recherche libre (sur title + description)
  if (search) {
    const q = search.toLowerCase();
    events = events.filter(ev =>
      ev.title.fr.toLowerCase().includes(q) ||
      ev.description.fr.toLowerCase().includes(q) ||
      ev.keywords.fr.some(k => k.toLowerCase().includes(q))
    );
  }

  // Pagination basique : after = [index]
  const startIdx = after && after[0] ? parseInt(after[0]) : 0;
  const sliced = events.slice(startIdx, startIdx + size);
  const nextAfter = startIdx + size < events.length ? [startIdx + size] : null;

  return {
    events: sliced,
    total: events.length,
    after: nextAfter,
  };
}

/**
 * Simule la réponse de l'endpoint /agendas/{uid}/events/{eventUid}
 * @param {string|number} uid
 * @returns {Object|null}
 */
export function getSampleEventById(uid) {
  const event = SAMPLE_EVENTS.find(ev => String(ev.uid) === String(uid));
  if (!event) return null;
  return { event };
}
