# Entreprise & Charte graphique

L'écran **Entreprise & Charte graphique** permet à un administrateur (`ROLE_ADMIN`) de configurer l'identité visuelle de l'entreprise dans laquelle ELYKIA est déployée : raison sociale, coordonnées, logo officiel et palette de couleurs. Cette configuration est totalement indépendante de la gestion des agences et s'applique globalement à l'application d'administration, aux **exports PDF** (fiches, rapports, reçus) ainsi qu'à l'**Espace Client** (web & mobile).

## Accès

1. Dans le menu latéral, ouvrez **Administration**.
2. Cliquez sur **Entreprise & Charte** (`/administration/entreprise`).

## Informations de l'entreprise

Dans la carte **Informations de l'entreprise**, renseignez ou modifiez :

- **Nom officiel de l'entreprise** (obligatoire) : affiché sur l'écran de connexion, dans les en-têtes/pieds de page PDF et dans l'Espace Client.
- **Nom court / Onglet navigateur** : utilisé comme titre de l'onglet du navigateur, sur le splash screen et les mentions courtes.
- **Slogan / Sous-titre** : affiché sous le nom de l'entreprise sur l'écran de connexion.
- **Coordonnées** : adresse du siège, téléphone, e-mail, site web et identifiant fiscal (NIF / RCCM), repris automatiquement dans les en-têtes de documents PDF.

## Charte graphique et couleurs

La carte **Charte graphique & Palette de couleurs** permet de personnaliser 6 couleurs clés :

- **Couleur primaire** : boutons principaux, titres, lien actif du menu, bandeaux et pieds de page PDF, et teinte principale de l'Espace Client.
- **Couleur secondaire** : indicateurs informatifs et graphiques.
- **Couleur d'accent** : badges positifs, mises en valeur et accents de l'Espace Client.
- **Fond du menu latéral** et **Texte du menu latéral** : apparence de la barre de navigation gauche (thème clair ou sombre).
- **Fond des pages** : teinte générale de l'espace de travail.

### Thèmes prédéfinis et aperçu en direct

1. Cliquez sur l'un des **Thèmes prédéfinis** (*Elykia Navy*, *Marine Prestige*, *Émeraude Corporate*, *Bordeaux Institutionnel*, *Indigo & Ardoise*) ou ajustez chaque couleur via le sélecteur ou son code hexadécimal (`#RRGGBB`).
2. Un **aperçu en direct** s'applique immédiatement sur l'interface ainsi que dans la miniature **Aperçu de l'interface** sans modifier les données enregistrées.
3. Cliquez sur **Enregistrer** pour persister la configuration, ou sur **Annuler l'aperçu** (ou quittez la page) pour revenir aux couleurs enregistrées.
4. Le bouton **Charte par défaut** réinitialise uniquement les 6 couleurs vers la palette officielle ELYKIA tout en conservant le nom de l'entreprise et le logo.

## Logo de l'entreprise

Dans la carte **Logo de l'entreprise** :

1. Vérifiez le rendu actuel sur fond clair et sur la couleur du menu latéral.
2. Cliquez ou glissez-déposez un fichier image au format **PNG**, **JPEG**, **WEBP** ou **SVG** (taille maximale **2 Mo**). Pour un rendu optimal dans l'interface et dans les exports PDF, privilégiez un **PNG transparent** ou un **SVG** propre (les scripts intégrés dans un SVG sont automatiquement refusés ; le format WEBP s'affiche sur le web mais revient au monogramme dans les PDF).
3. Le logo est immédiatement enregistré, affiché dans le menu latéral, sur la page de connexion, dans l'Espace Client, en icône d'onglet (favicon) et dans les en-têtes des documents PDF.
4. Pour revenir au logo ELYKIA intégré, cliquez sur **Supprimer** puis confirmez.

## Propagation automatique (Web, PDF et Espace Client)

Chaque enregistrement (informations, couleurs ou logo) incrémente automatiquement le numéro de version du thème (`vN`) :

- **Exports PDF :** tous les documents générés côté serveur (fiches clients, rapports commerciaux, tableaux de stock, reçus de commande tontine) lisent le profil entreprise mis en cache (Caffeine) pour afficher le nom, l'adresse, le téléphone, le logo et les couleurs de la charte dans l'en-tête, les tableaux et le pied de page `n/N`.
- **Espace Client :** l'application charge la charte au démarrage depuis le cache local (`localStorage`), la revalide via `ETag` HTTP et applique automatiquement le nom, le logo, le favicon et la palette sur le splash screen, la connexion mobile/desktop et le menu latéral desktop.
- **Gestion du cache :** invalidation immédiate côté serveur (Caffeine + HTTP `ETag`), chargement sans clignotement (`localStorage`), URL de logo versionnée immuable (`/api/public/company/logo?v=N`) et synchronisation temps réel entre onglets.
