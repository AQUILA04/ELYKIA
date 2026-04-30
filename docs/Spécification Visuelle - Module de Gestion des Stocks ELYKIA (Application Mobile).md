# Spécification Visuelle - Module de Gestion des Stocks ELYKIA (Application Mobile)

## 1. Vision et Principes de Design

Le module de gestion des stocks de l'application mobile ELYKIA est conçu pour les agents commerciaux (collecteurs) sur le terrain. L'interface doit être **moderne, fluide et premium**, tout en restant hautement fonctionnelle pour des opérations rapides en mobilité.

La philosophie "Mobile-First" impose que l'interface soit pensée nativement pour les écrans tactiles, typiquement de 375px à 430px de largeur. Les zones de tap doivent être larges, avec un minimum de 44x44px, et la navigation doit être optimisée pour une utilisation au pouce. Par ailleurs, l'approche "Online-First" est de rigueur. Les requêtes s'effectuant en temps réel vers l'API, des états de chargement tels que des skeletons et des retours visuels immédiats via des spinners ou des toasts sont obligatoires pour pallier toute latence réseau. Le Design System global adopte un style "Enterprise SaaS Mobile", combinant un minimalisme élégant avec des repères visuels forts pour les statuts.

## 2. Design System et Charte Graphique

L'application utilise une palette inspirée des standards Fintech, alliant la confiance véhiculée par les bleus et indigos à la clarté indispensable des statuts.

| Rôle | Token | Valeur Hex | Utilisation |
|------|-------|------------|-------------|
| **Primaire** | `--color-primary` | `#1E40AF` (Bleu) | Boutons principaux, onglets actifs, icônes clés |
| **Secondaire** | `--color-secondary` | `#64748B` (Slate) | Éléments d'accentuation, dégradés subtils |
| **Fond App** | `--color-background` | `#F8FAFC` (Slate 50) | Fond principal de l'application |
| **Surfaces** | `--color-surface` | `#FFFFFF` (Blanc) | Cartes, modales, bottom sheets |
| **Texte Principal** | `--color-text-primary` | `#0F172A` (Slate 900) | Titres, texte principal, valeurs |
| **Texte Secondaire** | `--color-text-muted` | `#64748B` (Slate 500) | Labels, sous-titres, placeholders |
| **Bordures** | `--color-border` | `#E2E8F0` (Slate 200) | Séparateurs, bordures de cartes |

Les couleurs sémantiques sont cruciales pour la gestion des stocks, car elles définissent les badges et les alertes.

| Statut | Fond (Light) | Texte (Dark) | Utilisation |
|--------|--------------|--------------|-------------|
| **En Attente / Créé** | `#FEF3C7` (Amber 100) | `#D97706` (Amber 600) | Statut `CREATED` |
| **Validé** | `#DBEAFE` (Blue 100) | `#2563EB` (Blue 600) | Statut `VALIDATED` |
| **Livré** | `#D1FAE5` (Emerald 100) | `#059669` (Emerald 600) | Statut `DELIVERED` |
| **Refusé / Annulé** | `#FEE2E2` (Red 100) | `#DC2626` (Red 600) | Statuts `REFUSED`, `CANCELLED` |

La typographie doit être lisible en extérieur, nécessitant un contraste élevé. La police principale recommandée est `Plus Jakarta Sans` ou `Inter`, qui sont des sans-serif géométriques. La hiérarchie typographique s'établit avec des en-têtes (H1) de 24px en ExtraBold (800), des titres de section (H2) de 18px en Bold (700), et un corps de texte de 16px en Regular (400), qui constitue la taille minimale pour éviter le zoom automatique sur iOS. Les labels et badges utiliseront une taille de 12px en SemiBold (600) avec une transformation en majuscules.

Concernant les formes et l'élévation, le design s'inspire du Material Design adapté. Les border-radius seront de `16px` (`--radius-card`) pour les cartes et modales, et de `8px` (`--radius-input`) pour les boutons et inputs, avec la possibilité d'utiliser `999px` pour les boutons primaires de type Pill. Les ombres (Shadows) utiliseront des ombres douces et colorées, en évitant le gris dur. Une ombre de carte typique sera définie par `0 4px 6px -1px rgba(79, 70, 229, 0.08)`.

## 3. Composants UI (Angular/Ionic)

Les composants communs incluent le Header (App Bar), les badges de statut et les états vides (Empty State). Le Header aura un fond `#F8FAFC` légèrement gris pour se fondre avec le background, une bordure basse subtile `#E2E8F0` avec une légère ombre portée, et un bouton retour prévisible situé sur le côté gauche. Les badges de statut adopteront une forme Pill (`border-radius: 999px`), un padding de `4px 12px`, et une typographie de 12px SemiBold. L'Empty State, utilisé lorsque le serveur est indisponible ou qu'aucune donnée n'est présente, affichera une illustration SVG centrée, un titre H2 explicite, un texte descriptif Muted, et un bouton "Réessayer" configuré avec `color="primary" fill="outline"`.

Les composants de formulaire nécessitent une attention particulière. Les inputs textuels et de date (`ion-item` + `ion-input`/`ion-datetime`) utiliseront le style "Floating Label" pour optimiser l'espace vertical. La bordure de focus sera animée avec la couleur `--color-primary`. La validation s'effectuera *onBlur*, affichant un message d'erreur en rouge sous le champ. L'utilisation stricte des attributs `inputmode` (ex: `numeric` pour les quantités) est requise. Le sélecteur d'articles privilégiera un composant de recherche plein écran ou un Bottom Sheet pour les listes longues, au lieu d'un simple select natif. Le répéteur d'articles affichera chaque article ajouté sous forme de carte horizontale, intégrant un contrôle de quantité de type "Stepper" et une icône poubelle (Destructive) alignée à droite pour la suppression.

## 4. Architecture des Écrans (User Journey)

L'architecture est divisée en deux flux principaux : les Sorties (Standard/Tontine) et les Retours (Standard/Tontine).

Le premier écran est la liste des demandes (Sorties ou Retours), dont l'objectif est de consulter l'historique filtré par le collecteur. Le Header affichera le titre approprié et une icône de filtre. Des filtres rapides sous forme de chips horizontaux scrollables permettront de trier par statut. Pendant le chargement des données, une liste de 3 à 5 fausses cartes clignotantes (skeleton loading) sera affichée. Les cartes de liste (`ion-card`) présenteront la référence et le badge de statut en en-tête, les dates de demande et de livraison dans le corps, et une icône chevron en pied de carte indiquant la navigabilité. Un Floating Action Button (FAB) primaire en bas à droite permettra de créer une nouvelle demande.

Le deuxième écran présente le détail d'une demande, permettant de voir les informations complètes et d'annuler si possible. Le Header contiendra le titre "Détail Demande" et un bouton Retour. Une section d'informations sous forme de carte blanche affichera le statut actuel, les dates et le nom du collecteur. La section des articles listera les lignes avec le nom de l'article en gras, la quantité avec un badge gris, et le prix unitaire aligné à droite. Les totaux seront affichés en bas de page de manière sticky. Si la demande est au statut `CREATED`, un bouton contextuel "Annuler la demande" sera disponible, nécessitant une confirmation via un Action Sheet ou une modale avant l'appel API.

Le troisième écran gère la création d'une demande (Sortie ou Retour), offrant un formulaire de saisie rapide sur le terrain. Le Header affichera le titre approprié et un bouton "Fermer". La première section contiendra les informations générales, notamment le champ Date, tandis que l'identifiant du collecteur sera géré silencieusement. La deuxième section sera un répéteur dynamique listant les articles ajoutés avec leur stepper de quantité, et un bouton pour ajouter un nouvel article. Le Footer, sticky en bas de page, contiendra le bouton "Soumettre la demande", qui affichera un spinner et se désactivera pendant l'appel API.

## 5. Directives Techniques & Angular/Ionic

Conformément aux exigences, la propriété `standalone: false` ne doit **jamais** être supprimée des décorateurs `@Component` dans l'application Angular/Ionic.

La gestion des erreurs API doit inclure un intercepteur HTTP global pour capturer les erreurs `503` ou les états hors ligne (`0`). Dans ces cas, l'application doit rediriger ou afficher conditionnellement le composant Empty State "Serveur Indisponible".

Pour assurer la traçabilité, toute action utilisateur (clic sur un bouton, soumission de formulaire) et tout retour API doivent utiliser une double journalisation, combinant `this.log.log(...)` et `console.log(...)`.

Enfin, l'accessibilité (A11y) est primordiale. Les emojis ne doivent pas être utilisés pour les icônes ; il faut privilégier les SVG tels que Ionicons ou Lucide. Un contraste minimum de 4.5:1 doit être assuré pour le texte, et toutes les zones cliquables doivent respecter une taille minimale de 44x44pt.

---
*Ce document sert de référence visuelle et structurelle pour l'intégration des flux de gestion des stocks dans l'application ELYKIA.*

## 6. Spécification des Écrans à Maquetter (Wireframes & Flux)

Cette section détaille la structure visuelle exacte des écrans à produire lors de la phase de maquettage (UI/UX Design), en traduisant les exigences fonctionnelles en composants d'interface structurés.

### 6.1. Écran : Liste des Demandes (Sorties / Retours)
Cet écran sert de point d'entrée pour consulter l'historique. Il doit exister en quatre variantes contextuelles (Sortie Standard, Sortie Tontine, Retour Standard, Retour Tontine) partageant la même structure de base.

Le Header (App Bar) comportera un titre centré tel que "Mes Sorties Standard", encadré par un bouton "Menu" ou "Retour" à gauche et une icône "Filtre" à droite. Juste en dessous, une barre de filtres rapides à défilement horizontal présentera des chips cliquables pour filtrer par statut : "Toutes" (actif par défaut), "En attente", "Validées", "Livrées", et "Annulées".

La zone de contenu principale, à défilement vertical, affichera une liste de cartes (`ion-card`). Chaque carte présentera sur sa première ligne la référence (ex: `REQ-2023-10-001`) en gras à gauche et un badge de statut (ex: `[EN ATTENTE]`) à droite. Les lignes suivantes afficheront la date de demande avec une icône de calendrier, puis la date de livraison prévue avec une icône de camion. Après un fin séparateur horizontal, la dernière ligne proposera un lien "Voir les détails" accompagné d'une icône chevron pointant vers la droite, coloré avec la couleur primaire. Enfin, un Floating Action Button (FAB) circulaire de couleur primaire avec une icône "+" blanche sera positionné en bas à droite pour ouvrir l'écran de création.

### 6.2. Écran : Détail d'une Demande
Cet écran affiche le contenu complet d'une demande spécifique et permet l'action d'annulation si le statut le permet.

Le Header affichera le titre "Détail de la demande" avec un bouton "Retour" à gauche. La section d'en-tête de la demande sera présentée sous forme de carte blanche avec une ombre douce. Elle contiendra un badge de statut large centré en haut, suivi d'une grille de données sur deux colonnes affichant la référence, la date de demande, le nom du collecteur et la date de livraison.

La section listant les articles débutera par un titre indiquant le nombre d'articles. Elle sera suivie d'une liste de lignes (`ion-item`) où chaque ligne présentera le nom de l'article en titre, un badge gris pour la quantité, et le prix total de la ligne aligné à droite en gras. Le Footer sera sticky en bas de l'écran, affichant la ligne "Total" avec la somme alignée à droite en grande taille. Si la demande est au statut "En attente", un bouton large "Annuler la demande" (`color="danger" fill="outline"`) sera affiché conditionnellement en dessous du total.

### 6.3. Écran : Création d'une Demande (Formulaire)
Cet écran permet à l'agent de saisir une nouvelle demande de sortie ou de retour. L'ergonomie doit faciliter la saisie rapide des articles et des quantités.

Le Header affichera le titre "Nouvelle Sortie" ou "Nouveau Retour", avec un bouton "Croix" (Fermer) à gauche. La section des informations générales contiendra un champ "Date de la demande" pré-rempli et grisé (disabled), tandis que le champ identifiant le collecteur sera masqué.

La section du répéteur d'articles commencera par le titre "Articles à demander". Elle proposera un bouton pleine largeur avec une bordure pointillée (Dashed) intitulé "+ Ajouter un article". Les lignes d'articles générées dynamiquement apparaîtront sous forme de cartes grises légères. Chaque carte contiendra le nom de l'article sélectionné, un stepper de quantité (`[-]` `[ 5 ]` `[+]`), et une icône "Poubelle" rouge en haut à droite pour supprimer la ligne. Le Footer, sticky en bas de l'écran, contiendra un bouton large "Soumettre la demande" utilisant la couleur primaire.

### 6.4. Composants Additionnels : Sélecteur d'Articles et Empty States

Le composant Sélecteur d'Articles s'ouvrira sous forme de Bottom Sheet ou de Modale lorsque l'utilisateur cliquera sur "+ Ajouter un article". Son Header inclura une barre de drag (petite pilule grise au centre) et le titre "Sélectionner un article". Une barre de recherche (`ion-searchbar`) sera fixée en haut pour filtrer rapidement le catalogue. La liste scrollable en dessous affichera les articles avec leur nom, catégorie et prix unitaire. Un clic sur une ligne sélectionnera l'article, fermera le composant et l'ajoutera au répéteur de l'écran parent avec une quantité par défaut de 1.

Les états visuels (Empty States et chargement) doivent être maquettés pour garantir une expérience utilisateur fluide.

| État | Illustration | Texte Descriptif | Action Proposée |
|------|--------------|------------------|-----------------|
| **Aucune demande** | Boîte vide (SVG) | Vous n'avez aucune demande pour le moment. | Bouton "Créer une demande" |
| **Serveur Indisponible** | Nuage déconnecté (SVG) | Impossible de joindre le serveur. Veuillez vérifier votre connexion. | Bouton "Réessayer" |
| **Chargement (Skeleton)** | Blocs gris animés | *Aucun texte, effet de pulsation simulant les cartes* | *Aucune action* |
