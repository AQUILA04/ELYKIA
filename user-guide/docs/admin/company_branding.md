# Entreprise & Charte graphique

L'écran **Entreprise & Charte graphique** permet à un administrateur (`ROLE_ADMIN`) de configurer l'identité visuelle de l'entreprise dans laquelle ELYKIA est déployée : raison sociale, coordonnées, logo officiel et palette de couleurs. Cette configuration est totalement indépendante de la gestion des agences et s'applique globalement à l'application web (écran de connexion, menu latéral, en-têtes, boutons, modales, titre de l'onglet et icône du navigateur).

## Accès

1. Dans le menu latéral, ouvrez **Administration**.
2. Cliquez sur **Entreprise & Charte** (`/administration/entreprise`).

## Informations de l'entreprise

Dans la carte **Informations de l'entreprise**, renseignez ou modifiez :

- **Nom officiel de l'entreprise** (obligatoire) : affiché notamment sur l'écran de connexion.
- **Nom court / Onglet navigateur** : utilisé comme titre de l'onglet du navigateur et mention de pied de page.
- **Slogan / Sous-titre** : affiché sous le nom de l'entreprise sur l'écran de connexion.
- **Coordonnées** : adresse du siège, téléphone, e-mail, site web et identifiant fiscal (NIF / RCCM).

## Charte graphique et couleurs

La carte **Charte graphique & Palette de couleurs** permet de personnaliser 6 couleurs clés :

- **Couleur primaire** : boutons principaux, titres, lien actif du menu et accents majeurs.
- **Couleur secondaire** : indicateurs informatifs et graphiques.
- **Couleur d'accent** : badges positifs et mises en valeur.
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
2. Cliquez ou glissez-déposez un fichier image au format **PNG**, **JPEG**, **WEBP** ou **SVG** (taille maximale **2 Mo**). Pour un rendu optimal, privilégiez un **PNG transparent** ou un **SVG** propre (les scripts intégrés dans un SVG sont automatiquement refusés).
3. Le logo est immédiatement enregistré, affiché dans le menu latéral, sur la page de connexion et en icône d'onglet (favicon).
4. Pour revenir au logo ELYKIA intégré, cliquez sur **Supprimer** puis confirmez.

## Persistance et gestion du cache

Chaque enregistrement (informations, couleurs ou logo) incrémente automatiquement le numéro de version du thème (`vN`) :

- Côté serveur, la configuration est persistée dans PostgreSQL et le cache applicatif est immédiatement invalidé.
- Côté navigateur, la charte est chargée instantanément depuis le cache local (`localStorage`) pour éviter tout clignotement visuel, revalidée via `ETag` HTTP, et synchronisée en temps réel entre tous les onglets ouverts.
- Le logo est servi via une URL versionnée immuable (`/api/public/company/logo?v=N`), garantissant une mise à jour immédiate chez tous les utilisateurs dès qu'un nouveau logo est téléversé.
