# Spécification UI/UX - Dashboard BI ELYKIA

## 1. VUE D'ENSEMBLE ET PRINCIPES DE DESIGN

### 1.1 Philosophie de Design
* **Clarté avant tout :** Le volume de données étant élevé, l'interface doit privilégier l'espace blanc (whitespace) et une hiérarchie visuelle stricte pour éviter la surcharge cognitive.
* **Data-Ink Ratio :** Minimiser l'encre non liée aux données. Les graphiques doivent être épurés, sans grilles inutiles ou 3D.
* **Actionnable :** Chaque métrique critique doit être cliquable (Drill-down) pour mener au détail opérationnel.
* **Consistance :** Utilisation stricte des codes couleurs sémantiques (Vert = Positif/Entrée, Rouge = Négatif/Sortie/Alerte).

### 1.2 Public Cible & Devices
* **Desktop (Prioritaire) :** 1920x1080 et 1366x768. Pour les gestionnaires et analystes.
* **Tablet (Secondaire) :** iPad Pro / Paysage. Pour les présentations exécutives.
* **Mobile (Consultation) :** Vue simplifiée pour les commerciaux sur le terrain (KPIs et Listes simples).

---

## 2. SYSTÈME DE DESIGN (DESIGN SYSTEM)

### 2.1 Palette de Couleurs

| Usage | Couleur | Code HEX | Signification |
|-------|---------|----------|---------------|
| **Primaire** | Bleu Royal | `#2563EB` | Actions principales, navigation, branding |
| **Secondaire** | Gris Ardoise| `#64748B` | Texte secondaire, bordures subtiles |
| **Fond** | Gris Clair | `#F8FAFC` | Arrière-plan global (réduit la fatigue oculaire) |
| **Surface** | Blanc | `#FFFFFF` | Cartes, modales, sidebars |
| **Succès** | Émeraude | `#10B981` | Croissance, Stock OK, Paiement reçu |
| **Attention** | Ambre | `#F59E0B` | Stock faible, Retard léger, Risque moyen |
| **Danger** | Rose Vif | `#EF4444` | Rupture, Retard critique, PAR élevé |
| **Neutre** | Indigo | `#6366F1` | Informations informatives, catégories neutres |

### 2.2 Typographie
* **Police :** *Inter* ou *Roboto* (Sans-serif).
* **Titres de section :** 18px - 24px, Gras (Weight 600).
* **KPIs (Big Numbers) :** 32px - 40px, Extra Gras (Weight 700).
* **Corps de texte :** 14px (Weight 400).
* **Tableaux / Données :** 13px, possibilité de police Monospace (`JetBrains Mono` ou `Roboto Mono`) pour les colonnes financières pour l'alignement vertical.

### 2.3 Composants d'Interface Clés
* **Cartes (Cards) :** Ombre légère (`box-shadow: 0 1px 3px rgba(0,0,0,0.1)`), coins arrondis (8px).
* **Badges d'état :** Fond pastel + Texte foncé (ex: Fond rouge clair + Texte rouge pour "Rupture").
* **Filtres :** Barre supérieure persistante ("Sticky") avec sélecteurs de dates (Date Range Picker) et listes déroulantes à sélection multiple (Tags).

---

## 3. ARCHITECTURE DE L'INFORMATION

### 3.1 Structure de Navigation (Sidebar Gauche)
La navigation doit être rétractable (collapsible) pour maximiser l'espace d'analyse.

1.  **Vue d'ensemble** (Dashboard)
2.  **Ventes** (Analyse commerciale)
3.  **Recouvrement** (Finances & Risques)
4.  **Stock** (Inventaire & Flux)
5.  **Clients** (Segmentation & RFM) - *Issu de l'analyse avancée*
6.  **Rapports** (Exports & Archives)
7.  **Administration** (Settings)

---

## 4. SPÉCIFICATIONS DÉTAILLÉES DES ÉCRANS

### 4.1 Global Layout
* **Header :**
    * Gauche : Fil d'Ariane (Breadcrumb).
    * Centre : **Sélecteur de Période Global** (Affecte toute la page).
    * Droite : Notifications (Cloche avec badge rouge), Profil utilisateur.
* **Feedback Système :**
    * Chargement : Skeletons (formes grises pulsantes) au lieu de spinners rotatifs pour une perception de vitesse accrue.
    * Erreurs : Toasts (notifications flottantes) en haut à droite.

### 4.2 Dashboard Overview (Homepage)

**Layout :** Grid 12 colonnes.

1.  **KPI Cards (Ligne 1 - 4 colonnes) :**
    * Chaque carte contient : Titre (Gris), Valeur (Gros, Noir), Indicateur de variation (Badge Vert/Rouge avec flèche et %), et un *Sparkline* (mini-graphique ligne) en arrière-plan pour montrer la tendance immédiate.
    * *Interaction :* Clic sur la carte redirige vers le module concerné.

2.  **Graphiques Principaux (Ligne 2) :**
    * **Évolution CA & Marge (2/3 largeur) :** Combo Chart. Barres pour le CA, Ligne pour la % Marge. Tooltip au survol affichant les valeurs exactes.
    * **Répartition Client (1/3 largeur) :** Donut Chart. Centre vide affichant le CA Total. Légende interactive (cliquer pour masquer une série).

3.  **Section Opérationnelle (Ligne 3) :**
    * **Top Commerciaux :** Liste compacte avec barres de progression horizontales pour le % d'objectif atteint. Avatar du commercial inclus.
    * **Alertes / Notifications :** Liste priorisée par gravité. Icônes distinctes (⚠️ Triangle jaune, 🛑 Octogone rouge). Bouton d'action rapide "Voir" au survol.

### 4.3 Module Ventes

* **Barre de Filtres Avancés :** Ajout de filtres spécifiques (Zone, Statut). Les filtres actifs apparaissent sous forme de "Chips" supprimables.
* **Visualisation Heatmap :** Matrice jour/heure.
    * Axe X : Heures (8h-20h). Axe Y : Jours (Lun-Dim).
    * Cellules : Intensité de couleur (Bleu pâle à Bleu foncé) selon le volume de vente.
* **Tableau de Performance :**
    * Colonnes triables.
    * La colonne "Tendance" contient un micro-graphique (flèche ou mini-barre).
    * Actions de ligne (menu `...`) : "Voir détails crédits", "Historique".

### 4.4 Module Recouvrement

* **Jauge de Recouvrement :**
    * Demi-cercle. Aiguille indiquant le % actuel. Zones colorées : Rouge (0-50%), Jaune (51-75%), Vert (76-100%).
    * Texte central : "X% Collecté".
* **Analyse des Retards (Histogramme) :**
    * Barres groupées par tranches de retard (0-7, 8-15, etc.).
    * Couleur des barres passant du jaune au rouge foncé selon la gravité du retard.
    * *Click-through :* Cliquer sur la barre "16-30j" ouvre une modale listant les crédits concernés.
* **Matrice de Risque (Scatter Plot) :**
    * Axe X : Montant restant dû.
    * Axe Y : Jours de retard.
    * Points : Chaque point est un client. Taille du point = Montant total du crédit. Couleur = Score de solvabilité.
    * Zone critique (Haut/Droite) surlignée en rouge clair.

### 4.5 Module Stock

* **Indicateurs Visuels de Stock :**
    * Utilisation de "Bullet Charts" pour chaque article dans la liste.
    * Barre grise (Capacité max/Stock optimal), Barre bleue (Stock actuel), Trait vertical rouge (Seuil de commande).
    * Si la barre bleue est sous le trait rouge, elle devient rouge.
* **Tableau Alertes Réapprovisionnement :**
    * Trié par défaut par "Urgence".
    * Bouton d'action primaire en bout de ligne : "Générer Bon de Commande" (Fake action ou lien vers module achat).
* **Analyse Pareto (ABC) :**
    * Graphique combiné spécifique. Barres décroissantes (Valeur stock) + Ligne courbe (Cumul %).
    * Ligne de seuil à 80% pour identifier visuellement les articles "Classe A".

### 4.6 Module Clients (Analytics Avancés)

* **Segmentation RFM :**
    * Treemap (Tuiles rectangulaires). La taille de la tuile représente le nombre de clients, la couleur représente le segment (Vert=Champions, Rouge=Perdus).
    * Au clic sur une tuile : Zoom in ou filtrage du tableau client en dessous.
* **Analyse de Cohorte :**
    * Tableau triangulaire (Heatmap inversée).
    * Lignes : Mois d'acquisition.
    * Colonnes : Mois +1, +2, +3...
    * Cellules : % de rétention (Couleur dégradée du vert au blanc).

---

## 5. INTERACTIVITÉ ET COMPORTEMENT

### 5.1 Tooltips (Infobulles)
Sur tous les graphiques, le survol doit afficher une infobulle riche :
* Fond blanc, ombre portée, bordure fine.
* Titre de la série (ex: "iPhone 13").
* Valeur principale en gras (ex: "2,500,000 FCFA").
* Comparaison contextuelle (ex: "vs mois dernier: +12%").

### 5.2 Drill-down (Forage)
* **Principe :** Ne jamais laisser une donnée "cul-de-sac".
* **Comportement :** Cliquer sur une barre "Jean K." dans le graphique des ventes ne filtre pas seulement la page, mais redirige vers la vue détaillée "Profil Commercial : Jean K." avec ses KPIs spécifiques.

### 5.3 Exportation
Chaque widget ou tableau doit avoir une icône discrète (en haut à droite du composant) permettant :
* Télécharger en PNG (pour les graphiques).
* Télécharger en CSV/Excel (pour les tableaux).

---

## 6. ADAPTATION MOBILE (RESPONSIVE)

### 6.1 Stratégie "Stacked"
* La grille 12 colonnes passe en 1 colonne.
* La Sidebar devient un menu "Hamburger" ou une barre de navigation inférieure (Bottom Navigation) pour les accès fréquents.

### 6.2 Simplification des Tableaux
* Sur mobile, les tableaux classiques sont illisibles.
* **Transformation :** Convertir chaque ligne du tableau en une "Card" individuelle.
    * Exemple : Une carte par crédit avec Nom Client et Montant en gras, et Statut en badge. Les détails secondaires sont masqués ou accessibles via un accordéon ("Voir plus").

### 6.3 Tactile
* Augmenter la taille des zones cliquables (min 44px x 44px) pour les filtres et boutons.
* Désactiver les tooltips au survol (inexistants) au profit d'une interaction "Tap to view".

---

## 7. CONSIDÉRATIONS D'ACCESSIBILITÉ (A11Y)

* **Contraste :** S'assurer que le texte gris sur fond blanc respecte le ratio WCAG AA (4.5:1).
* **Daltonisme :** Ne pas utiliser *que* la couleur pour signifier l'état.
    * Mauvais : Point rouge vs Point vert.
    * Bon : Point rouge + Icône "Attention" vs Point vert + Icône "Check".
* **Focus :** Les éléments interactifs doivent avoir un état de focus visible pour la navigation au clavier.
