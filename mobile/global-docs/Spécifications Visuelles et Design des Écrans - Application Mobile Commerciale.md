# Spécifications Visuelles et Design des Écrans - Application Mobile Commerciale

## 1. Introduction

Ce document présente les spécifications visuelles détaillées de tous les écrans de l'application mobile commerciale. L'objectif est de créer une interface utilisateur moderne, intuitive et professionnelle, optimisée pour les appareils mobiles et tablettes. Le design suit les principes de Material Design et d'ergonomie mobile pour assurer une expérience utilisateur exceptionnelle.

## 2. Principes de Design Généraux

### 2.1. Palette de Couleurs

**Couleurs Principales :**
- **Primaire :** #1976D2 (Bleu professionnel)
- **Primaire Variant :** #1565C0 (Bleu foncé)
- **Secondaire :** #FF9800 (Orange accent)
- **Secondaire Variant :** #F57C00 (Orange foncé)

**Couleurs de Support :**
- **Surface :** #FFFFFF (Blanc)
- **Background :** #F5F5F5 (Gris très clair)
- **Error :** #F44336 (Rouge)
- **Success :** #4CAF50 (Vert)
- **Warning :** #FF9800 (Orange)
- **Info :** #2196F3 (Bleu clair)

**Couleurs de Texte :**
- **Texte Principal :** #212121 (Noir charbon)
- **Texte Secondaire :** #757575 (Gris moyen)
- **Texte sur Primaire :** #FFFFFF (Blanc)

### 2.2. Typographie

**Police Principale :** Roboto (Android) / SF Pro (iOS)
- **Titre Principal (H1) :** 28sp, Bold
- **Titre Secondaire (H2) :** 24sp, Medium
- **Sous-titre (H3) :** 20sp, Medium
- **Corps de Texte :** 16sp, Regular
- **Texte Secondaire :** 14sp, Regular
- **Caption :** 12sp, Regular

### 2.3. Espacement et Dimensions

**Marges et Paddings :**
- **Marge Externe :** 16dp
- **Marge Interne :** 12dp
- **Espacement Éléments :** 8dp
- **Espacement Sections :** 24dp

**Dimensions des Éléments :**
- **Hauteur Bouton Principal :** 48dp
- **Hauteur Champ de Saisie :** 56dp
- **Rayon d'Arrondi :** 8dp
- **Élévation Cards :** 4dp

## 3. Spécifications Détaillées des Écrans

### EC001 - Écran de Connexion

**Description :** Premier écran affiché au lancement de l'application, permettant l'authentification de l'utilisateur.

**Composants Visuels :**

**Header (Zone Supérieure - 30% de l'écran) :**
- Fond dégradé du bleu primaire (#1976D2) vers le bleu variant (#1565C0)
- Logo de l'application centré (120x120dp) avec effet d'ombre portée
- Titre "Commercial App" en blanc, 24sp, centré sous le logo
- Sous-titre "Gestion Mobile" en blanc semi-transparent (70%), 16sp

**Zone de Connexion (Zone Centrale - 50% de l'écran) :**
- Card blanche avec élévation 8dp, coins arrondis 12dp
- Marge horizontale : 24dp
- Padding interne : 24dp

**Champs de Saisie :**
- **Champ Username :**
  - Label "Nom d'utilisateur" en couleur primaire, 14sp
  - Champ de saisie avec bordure arrondie (8dp), hauteur 56dp
  - Icône utilisateur à gauche (24x24dp) en couleur primaire
  - Placeholder "Saisissez votre nom d'utilisateur"
  - Marge bottom : 16dp

- **Champ Password :**
  - Label "Mot de passe" en couleur primaire, 14sp
  - Champ de saisie avec bordure arrondie (8dp), hauteur 56dp
  - Icône cadenas à gauche (24x24dp) en couleur primaire
  - Icône œil à droite pour afficher/masquer le mot de passe
  - Placeholder "Saisissez votre mot de passe"
  - Marge bottom : 24dp

**Bouton de Connexion :**
- Bouton principal pleine largeur, hauteur 48dp
- Fond couleur primaire (#1976D2)
- Texte "SE CONNECTER" en blanc, 16sp, bold
- Coins arrondis 8dp
- Effet d'élévation 2dp avec animation au tap
- Marge bottom : 16dp

**Zone de Statut de Connexion :**
- Indicateur de statut réseau (icône + texte) centré
- Couleur verte si connecté, orange si hors ligne
- Texte 12sp, couleur secondaire

**Footer (Zone Inférieure - 20% de l'écran) :**
- Fond transparent
- Version de l'application centrée en bas
- Texte "Version 1.0.0" en couleur secondaire, 12sp

**États d'Interaction :**
- **Loading :** Spinner circulaire au centre du bouton avec fond flou
- **Erreur :** Bordure rouge sur les champs, message d'erreur en rouge sous le bouton
- **Succès :** Animation de transition vers le tableau de bord

### EC002 - Écran de Chargement Initial

**Description :** Écran affiché pendant l'initialisation des données après la connexion.

**Composants Visuels :**

**Background :**
- Fond dégradé du bleu primaire vers le bleu variant
- Effet de verre dépoli (blur) avec transparence 80%

**Zone Centrale :**
- Card blanche semi-transparente (90%), centrée
- Dimensions : 280x200dp
- Coins arrondis 16dp
- Élévation 12dp

**Contenu de la Card :**
- **Logo :** Icône de l'application (64x64dp) centrée en haut
- **Titre :** "Initialisation en cours..." en couleur primaire, 18sp, bold
- **Barre de Progression :** 
  - Largeur 200dp, hauteur 6dp
  - Couleur primaire avec animation fluide
  - Coins arrondis 3dp
- **Texte de Statut :** Description de l'étape en cours
  - "Récupération des articles..."
  - "Synchronisation des clients..."
  - etc.
- **Pourcentage :** Affiché en couleur secondaire, 14sp

**Animation :**
- Rotation douce du logo (360° en 3 secondes)
- Pulsation de la barre de progression
- Transition fluide entre les textes de statut

### EC003 - Tableau de Bord Principal

**Description :** Écran principal affiché après la connexion, présentant les KPIs et statistiques du commercial.

**Composants Visuels :**

**Header (Hauteur : 120dp) :**
- Fond couleur primaire (#1976D2)
- **Zone Utilisateur (Gauche) :**
  - Avatar utilisateur (48x48dp) avec bordure blanche 2dp
  - Nom du commercial en blanc, 16sp, medium
  - Statut "En ligne/Hors ligne" en blanc semi-transparent, 12sp
- **Zone Actions (Droite) :**
  - Icône synchronisation (24x24dp) avec badge de notification
  - Icône menu (24x24dp)

**Section KPIs (Zone Supérieure) :**
- **Card Ventes du Mois :**
  - Dimensions : (largeur-32dp)/2 x 100dp
  - Fond blanc, élévation 4dp, coins arrondis 8dp
  - Icône vente (32x32dp) en couleur secondaire
  - Montant en couleur primaire, 24sp, bold
  - Label "Ventes du mois" en couleur secondaire, 12sp
  
- **Card Recouvrements du Mois :**
  - Même style que la card ventes
  - Icône recouvrement en couleur success
  - Positionnée à droite de la card ventes

**Section Graphiques (Zone Centrale) :**
- **Card Tendances :**
  - Largeur complète, hauteur 200dp
  - Titre "Tendances (30 derniers jours)" en couleur primaire, 16sp
  - Graphique linéaire avec deux courbes :
    - Ventes (couleur primaire)
    - Recouvrements (couleur success)
  - Légende en bas avec points colorés

**Section Actions Rapides (Zone Inférieure) :**
- **Grille 2x2 de boutons d'action :**
  - **Nouvelle Distribution :**
    - Icône panier (32x32dp) en couleur primaire
    - Texte "Nouvelle Distribution" 14sp
    - Fond blanc, bordure couleur primaire
  
  - **Nouveau Recouvrement :**
    - Icône argent (32x32dp) en couleur success
    - Texte "Recouvrement" 14sp
    - Fond blanc, bordure couleur success
  
  - **Nouveau Client :**
    - Icône personne+ (32x32dp) en couleur secondaire
    - Texte "Nouveau Client" 14sp
    - Fond blanc, bordure couleur secondaire
  
  - **Rapport Journalier :**
    - Icône document (32x32dp) en couleur info
    - Texte "Rapport" 14sp
    - Fond blanc, bordure couleur info

**Bottom Navigation (Hauteur : 56dp) :**
- Fond blanc avec bordure supérieure gris clair
- 4 onglets : Tableau de Bord, Clients, Distributions, Plus
- Icônes 24x24dp avec labels 10sp
- Onglet actif en couleur primaire, inactifs en gris

### EC004 - Liste des Clients

**Description :** Écran présentant la liste de tous les clients du commercial avec fonctionnalités de recherche et filtrage.

**Composants Visuels :**

**Header avec Recherche (Hauteur : 120dp) :**
- Fond couleur primaire
- **Barre de Recherche :**
  - Champ de recherche blanc avec icône loupe
  - Placeholder "Rechercher un client..."
  - Hauteur 40dp, coins arrondis 20dp
  - Marge horizontale 16dp

**Filtres Rapides (Hauteur : 48dp) :**
- ScrollView horizontal avec chips de filtrage
- **Chips :** "Tous", "Crédit en cours", "Nouveau", "Quartier"
- Fond blanc, bordure couleur primaire pour actif
- Texte 12sp, padding horizontal 12dp

**Liste des Clients :**
- **Item Client (Hauteur : 80dp) :**
  - **Photo de Profil :** CircleImageView 48x48dp à gauche
  - **Informations Principales :**
    - Nom complet en couleur primaire, 16sp, medium
    - Adresse en couleur secondaire, 14sp
    - Téléphone en couleur secondaire, 12sp
  - **Informations Secondaires (Droite) :**
    - Solde du compte en couleur success/error selon le signe
    - Badge "Crédit en cours" si applicable
    - Icône localisation cliquable (24x24dp)
  - **Séparateur :** Ligne grise 1dp avec marge 16dp

**Bouton d'Action Flottant :**
- Position : Bottom-right avec marge 16dp
- Couleur secondaire (#FF9800)
- Icône "+" (24x24dp) en blanc
- Diamètre 56dp avec élévation 6dp
- Action : Ajouter nouveau client

### EC005 - Détail Client

**Description :** Écran présentant les informations détaillées d'un client avec ses crédits et historique.

**Composants Visuels :**

**Header Client (Hauteur : 200dp) :**
- Fond dégradé couleur primaire
- **Photo de Profil :** 120x120dp centrée avec bordure blanche 4dp
- **Nom Complet :** Blanc, 20sp, bold, centré
- **Informations de Base :** Adresse, téléphone en blanc semi-transparent

**Onglets (Hauteur : 48dp) :**
- Fond blanc avec bordure inférieure
- **3 Onglets :** "Informations", "Crédits", "Historique"
- Indicateur couleur primaire sous l'onglet actif

**Contenu selon l'Onglet :**

**Onglet Informations :**
- **Cards d'Information :**
  - **Informations Personnelles :** Nom, prénom, date de naissance, profession
  - **Contact :** Téléphone, adresse, quartier
  - **Pièce d'Identité :** Type et numéro
  - **Personne à Contacter :** Si renseignée
  - **Géolocalisation :** Coordonnées avec bouton "Voir sur la carte"

**Onglet Crédits :**
- **Liste des Crédits Actifs :**
  - **Item Crédit (Hauteur : 100dp) :**
    - Référence du crédit en couleur primaire, 16sp
    - Montant total et montant restant
    - Barre de progression du remboursement
    - Date de début et date d'échéance
    - Statut avec badge coloré

**Onglet Historique :**
- **Timeline des Transactions :**
  - Distributions et recouvrements chronologiques
  - Icônes différentes pour chaque type d'opération
  - Montants et dates

### EC006 - Formulaire Nouveau Client

**Description :** Écran de saisie pour l'enregistrement d'un nouveau client avec toutes ses informations.

**Composants Visuels :**

**Header (Hauteur : 56dp) :**
- Fond couleur primaire
- Icône retour (24x24dp) à gauche
- Titre "Nouveau Client" centré, blanc 18sp
- Icône sauvegarde (24x24dp) à droite

**Formulaire (ScrollView) :**

**Section Photo (Hauteur : 120dp) :**
- Zone de photo centrée 100x100dp
- Bordure pointillée couleur primaire si vide
- Icône appareil photo (48x48dp) si vide
- Bouton "Prendre Photo" sous la zone

**Section Informations Personnelles :**
- **Champs Obligatoires (marqués d'un astérisque rouge) :**
  - Prénom et Nom (2 colonnes)
  - Date de naissance (avec DatePicker)
  - Profession
  - Téléphone

**Section Pièce d'Identité :**
- **Type de Pièce :** Dropdown (CENI, Passeport, Carte d'identité)
- **Numéro :** Champ texte

**Section Adresse :**
- **Adresse Complète :** Champ texte multiligne
- **Quartier :** Dropdown des localités
- **Géolocalisation :**
  - Bouton "Obtenir Position GPS" avec icône localisation
  - Affichage des coordonnées obtenues
  - Option saisie manuelle

**Section Personne à Contacter (Optionnel) :**
- Champs repliables : Nom, Téléphone, Adresse

**Boutons d'Action (Hauteur : 72dp) :**
- **Bouton Annuler :** Bordure couleur error, texte couleur error
- **Bouton Enregistrer :** Fond couleur primaire, texte blanc
- Largeur égale, séparés par 16dp de marge

### EC007 - Écran de Distribution

**Description :** Écran pour enregistrer une nouvelle distribution d'articles à un client.

**Composants Visuels :**

**Header (Hauteur : 56dp) :**
- Fond couleur primaire
- Titre "Nouvelle Distribution" centré
- Icône retour à gauche, icône validation à droite

**Section Sélection Client (Hauteur : 80dp) :**
- **Card Client Sélectionné :**
  - Photo client (48x48dp) à gauche
  - Nom et informations à droite
  - Bouton "Changer" à l'extrême droite
  - Fond blanc, bordure couleur primaire

**Section Articles Disponibles :**
- **Header Section :** "Articles Disponibles" avec compteur
- **Liste Articles :**
  - **Item Article (Hauteur : 100dp) :**
    - **Informations Article (Gauche) :**
      - Nom commercial en couleur primaire, 16sp
      - Type et marque en couleur secondaire, 14sp
      - Stock disponible en couleur success, 12sp
    - **Prix et Quantité (Droite) :**
      - Prix unitaire en couleur primaire, 16sp, bold
      - Contrôles quantité : boutons -/+ avec champ central
      - Sous-total calculé automatiquement

**Section Résumé (Hauteur : 120dp) :**
- **Card Résumé :**
  - Fond couleur primaire avec transparence 10%
  - **Ligne 1 :** "Articles sélectionnés : X"
  - **Ligne 2 :** "Montant total : XXXXX FCFA" en bold
  - **Ligne 3 :** "Mise journalière : XXXXX FCFA"

**Bouton Confirmer Distribution :**
- Pleine largeur, hauteur 48dp
- Fond couleur secondaire
- Texte "CONFIRMER LA DISTRIBUTION" blanc, bold
- Position fixe en bas avec marge 16dp

### EC008 - Écran de Recouvrement

**Description :** Écran pour enregistrer un recouvrement auprès d'un client.

**Composants Visuels :**

**Header (Hauteur : 56dp) :**
- Fond couleur success (#4CAF50)
- Titre "Nouveau Recouvrement" centré
- Icône retour à gauche

**Section Sélection Client :**
- Identique à l'écran de distribution
- Couleur d'accent success au lieu de primaire

**Section Crédits du Client :**
- **Liste des Crédits Actifs :**
  - **Item Crédit (Hauteur : 120dp) :**
    - **Header :** Référence crédit + date
    - **Barre de Progression :** Remboursement actuel
    - **Informations :**
      - Montant total du crédit
      - Montant déjà payé
      - Montant restant dû (en bold, couleur error)
      - Mise journalière attendue
    - **Bouton Sélectionner :** Couleur success

**Section Saisie Montant (Visible après sélection crédit) :**
- **Card Saisie :**
  - **Montant Attendu :** Affiché en grand, couleur success
  - **Champ Saisie :** Montant collecté avec clavier numérique
  - **Validation :** Vérification que montant ≤ montant restant dû

**Bouton Confirmer Recouvrement :**
- Fond couleur success
- Texte "CONFIRMER LE RECOUVREMENT"
- Position fixe en bas

### EC009 - Écran de Synchronisation

**Description :** Écran affiché pendant la synchronisation des données avec le serveur.

**Composants Visuels :**

**Background :**
- Fond couleur primaire avec dégradé
- Effet de particules animées

**Zone Centrale :**
- **Card Principale (300x400dp) :**
  - Fond blanc, coins arrondis 16dp
  - Élévation 12dp

**Contenu de la Card :**
- **Icône Synchronisation :** 64x64dp avec animation de rotation
- **Titre :** "Synchronisation en cours" 20sp, couleur primaire
- **Étapes de Synchronisation :**
  - Liste des étapes avec icônes de statut
  - ✓ Vert pour terminé
  - ⟳ Bleu pour en cours
  - ○ Gris pour en attente
  - ✗ Rouge pour erreur

**Barre de Progression Globale :**
- Largeur 260dp, hauteur 8dp
- Couleur primaire avec animation fluide
- Pourcentage affiché en dessous

**Bouton Annuler (si applicable) :**
- Texte "ANNULER" couleur error
- Position en bas de la card

### EC010 - Écran de Rapport Journalier

**Description :** Écran présentant le rapport des activités journalières du commercial.

**Composants Visuels :**

**Header (Hauteur : 80dp) :**
- Fond couleur info (#2196F3)
- **Titre :** "Rapport Journalier" centré
- **Date :** Date du rapport en sous-titre
- **Icône Impression :** À droite

**Section Résumé (Hauteur : 120dp) :**
- **2 Cards côte à côte :**
  - **Card Distributions :**
    - Icône panier couleur primaire
    - Nombre de distributions
    - Montant total distribué
  - **Card Recouvrements :**
    - Icône argent couleur success
    - Nombre de recouvrements
    - Montant total collecté

**Section Détails :**
- **Onglets :** "Distributions" et "Recouvrements"
- **Liste Détaillée :**
  - **Item Transaction :**
    - Heure de la transaction
    - Nom du client
    - Détails (articles ou montant)
    - Montant avec couleur appropriée

**Bouton Imprimer :**
- Fond couleur info
- Icône imprimante + texte "IMPRIMER LE RAPPORT"
- Position fixe en bas

### EC011 - Messages d'Alerte et de Confirmation

**Description :** Écrans modaux pour les messages système (succès, erreur, confirmation).

**Composants Visuels :**

**Dialog de Succès :**
- **Background :** Semi-transparent noir 50%
- **Card Centrale :** 280x200dp, coins arrondis 12dp
- **Icône :** Checkmark circulaire vert (48x48dp)
- **Titre :** Couleur success, 18sp, bold
- **Message :** Couleur texte principal, 14sp
- **Bouton OK :** Couleur success, pleine largeur

**Dialog d'Erreur :**
- Même structure que succès
- **Icône :** X circulaire rouge (48x48dp)
- **Couleurs :** Error (#F44336)
- **Bouton :** "RÉESSAYER" ou "OK"

**Dialog de Confirmation :**
- **Icône :** Point d'interrogation orange (48x48dp)
- **Titre :** "Confirmation requise"
- **Message :** Question à confirmer
- **2 Boutons :**
  - "ANNULER" (bordure, couleur secondaire)
  - "CONFIRMER" (fond couleur primaire)

**Toast Messages :**
- **Position :** Bas de l'écran avec marge 16dp
- **Dimensions :** Largeur adaptative, hauteur 48dp
- **Couleurs selon le type :**
  - Success : Fond vert, texte blanc
  - Error : Fond rouge, texte blanc
  - Info : Fond bleu, texte blanc
  - Warning : Fond orange, texte blanc
- **Animation :** Slide up/down avec fade

## 4. Responsive Design et Adaptabilité

### 4.1. Tablettes (Écrans > 7 pouces)

**Adaptations :**
- **Layout en 2 colonnes** pour les listes (clients, articles)
- **Sidebar navigation** au lieu de bottom navigation
- **Cards plus larges** avec plus d'informations visibles
- **Formulaires en 2 colonnes** pour optimiser l'espace

### 4.2. Écrans Pliables

**Adaptations :**
- **Mode déplié :** Interface tablette avec sidebar
- **Mode plié :** Interface mobile standard
- **Transition fluide** entre les modes

### 4.3. Orientation Paysage

**Adaptations :**
- **Header réduit** pour maximiser le contenu
- **Navigation latérale** pour les écrans principaux
- **Formulaires optimisés** avec champs en ligne

## 5. Animations et Micro-interactions

### 5.1. Transitions d'Écrans

**Slide Transition :**
- **Durée :** 300ms
- **Courbe :** Ease-in-out
- **Direction :** Gauche-droite pour navigation avant, inverse pour retour

### 5.2. Animations d'Éléments

**Boutons :**
- **Tap :** Scale 0.95 avec durée 100ms
- **Loading :** Rotation de l'icône ou spinner

**Cards :**
- **Apparition :** Fade in + slide up (200ms)
- **Hover/Focus :** Élévation +2dp (150ms)

**Listes :**
- **Scroll :** Parallax subtil sur les headers
- **Refresh :** Pull-to-refresh avec animation personnalisée

### 5.3. Feedback Visuel

**États de Chargement :**
- **Skeleton screens** pour les listes
- **Shimmer effect** sur les cards en chargement
- **Progress indicators** pour les opérations longues

**États d'Erreur :**
- **Shake animation** pour les champs en erreur
- **Color transition** vers la couleur d'erreur
- **Icon bounce** pour attirer l'attention

## 6. Accessibilité et Ergonomie

### 6.1. Contraste et Lisibilité

**Ratios de Contraste :**
- **Texte principal :** Minimum 4.5:1
- **Texte large :** Minimum 3:1
- **Éléments interactifs :** Minimum 3:1

### 6.2. Tailles de Touch Targets

**Dimensions Minimales :**
- **Boutons :** 48x48dp
- **Liens :** 44x44dp
- **Champs de saisie :** 48dp de hauteur

### 6.3. Support des Technologies d'Assistance

**Implémentation :**
- **Labels sémantiques** pour tous les éléments interactifs
- **Descriptions alternatives** pour les images et icônes
- **Navigation au clavier** pour les utilisateurs avec handicaps moteurs
- **Annonces vocales** pour les changements d'état importants

---

**Auteur :** Manus AI - Directeur Artistique et Expert en Design Mobile
**Date :** 25 Juillet 2025
**Version :** 1.0

