# Accessibilité (A11y) - Module de Gestion des Stocks ELYKIA

Ce document définit les règles d'accessibilité à respecter pour le module mobile de gestion des stocks.

## 1. Zones de Clic (Touch Targets)

*   Toutes les zones cliquables (boutons, liens, icônes interactives) doivent avoir une taille minimale de **44x44px** pour faciliter l'utilisation au pouce sur mobile.
*   Utilisez des marges ou des paddings suffisants autour des éléments interactifs pour éviter les clics accidentels.

## 2. Contraste des Couleurs

*   Assurez un contraste minimum de **4.5:1** pour le texte normal et de **3:1** pour le texte de grande taille (H1, H2) par rapport à l'arrière-plan.
*   Vérifiez particulièrement le contraste des badges de statut (texte foncé sur fond clair).

## 3. Utilisation des Icônes

*   **Ne jamais utiliser d'emojis** pour représenter des icônes ou des actions.
*   Privilégiez les SVG (Ionicons ou Lucide) qui sont redimensionnables et peuvent être stylisés via CSS.
*   Assurez-vous que les icônes importantes (ex: poubelle pour supprimer) sont accompagnées d'un texte alternatif ou d'un aria-label si elles sont utilisées seules comme boutons.

## 4. Gestion des Formulaires

*   Associez toujours un `<label>` ou un `<ion-label>` à chaque champ de saisie (`<input>`, `<ion-input>`, `<ion-datetime>`).
*   Utilisez les attributs `inputmode` appropriés pour optimiser le clavier virtuel (ex: `inputmode="numeric"` pour les quantités).
*   Affichez les messages d'erreur de validation de manière claire et explicite, en utilisant la couleur d'erreur (`--ion-color-danger`) et en les associant au champ concerné via `aria-describedby`.

## 5. Gestion du Focus et de la Navigation

*   Gérez correctement le focus lors de l'ouverture de modales ou de bottom sheets (le focus doit être déplacé vers le premier élément interactif de la modale).
*   Assurez-vous que l'utilisateur peut fermer les modales et les alertes via le clavier (touche Échap) ou un bouton de fermeture explicite.
*   Utilisez des rôles ARIA appropriés (ex: `role="alert"`, `role="dialog"`) pour les composants dynamiques.
# Composants UI - Module de Gestion des Stocks ELYKIA

Ce document détaille les composants clés du module mobile de gestion des stocks. Il est basé sur les maquettes et spécifications visuelles.

## 1. Header (App Bar)

Le Header est un composant partagé utilisé sur toutes les pages.

*   **Structure:** `<ion-header>` avec une `<ion-toolbar>`.
*   **Couleurs:** Fond `#F8FAFC`, bordure inférieure subtile `#E2E8F0` avec une légère ombre portée (`box-shadow: 0 1px 3px rgba(0,0,0,0.05);`).
*   **Contenu:** Bouton retour/menu à gauche (`<ion-buttons slot="start">`), Titre centré (`<ion-title>`), Bouton d'action à droite (`<ion-buttons slot="end">`).

```html
<!-- Exemple d'utilisation du Header -->
<ion-header class="ion-no-border stock-header">
  <ion-toolbar>
    <ion-buttons slot="start">
      <ion-back-button defaultHref="/stock"></ion-back-button>
    </ion-buttons>
    <ion-title>Détail de la demande</ion-title>
    <ion-buttons slot="end">
      <ion-button>
        <ion-icon name="filter-outline"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>
```

## 2. Badges de Statut

Les badges indiquent visuellement l'état d'une demande. Ils utilisent la forme "Pill".

*   **Structure:** `<ion-chip>` ou une balise `<span>` stylisée.
*   **Style:** `border-radius: 999px`, padding de `4px 12px`, typographie 12px SemiBold, texte en majuscules.
*   **Variantes:** En attente (`#FEF3C7` / `#D97706`), Validé (`#DBEAFE` / `#2563EB`), Livré (`#D1FAE5` / `#059669`), Annulé (`#FEE2E2` / `#DC2626`).

```html
<!-- Exemple de Badge de Statut -->
<span class="status-badge status-pending">EN ATTENTE</span>

<style>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}
.status-pending {
  background-color: #FEF3C7;
  color: #D97706;
}
/* Autres statuts... */
</style>
```

## 3. Carte de Demande (Liste)

Composant utilisé dans l'écran "Liste des Demandes".

*   **Structure:** `<ion-card>`.
*   **Contenu:** Référence, badge de statut, date de demande, date de livraison prévue, bouton "Voir les détails".
*   **Style:** Ombre douce (`--shadow-card`), bordures arrondies (`--radius-card`), fond blanc (`--color-surface`).

```html
<!-- Exemple de Carte de Demande -->
<ion-card class="request-card">
  <ion-card-content>
    <div class="card-header">
      <h3 class="reference">REQ-2023-10-001</h3>
      <span class="status-badge status-pending">EN ATTENTE</span>
    </div>
    <div class="card-body">
      <div class="info-row">
        <ion-icon name="calendar-outline"></ion-icon>
        <span>Demande : 12 Oct 2023</span>
      </div>
      <div class="info-row">
        <ion-icon name="car-outline"></ion-icon>
        <span>Livraison prévue : 15 Oct 2023</span>
      </div>
    </div>
    <div class="card-footer">
      <ion-button fill="clear" expand="block" routerLink="/stock/details/1">
        Voir les détails
        <ion-icon slot="end" name="chevron-forward-outline" color="primary"></ion-icon>
      </ion-button>
    </div>
  </ion-card-content>
</ion-card>
```

## 4. Répéteur d'Articles avec Stepper

Composant utilisé dans l'écran de création pour lister et ajuster les quantités des articles.

*   **Structure:** Lignes (`<ion-item>` ou `<div>`) contenant le nom, le stepper, et un bouton de suppression.
*   **Stepper:** Boutons `-` et `+` encadrant un `<input type="number" inputmode="numeric">`.
*   **Bouton de suppression:** Icône poubelle (`trash-outline`), couleur rouge (Destructive).

```html
<!-- Exemple de Ligne d'Article avec Stepper -->
<div class="article-row">
  <div class="article-icon">
    <ion-icon name="cube-outline"></ion-icon>
  </div>
  <div class="article-info">
    <h4>Roulement à Billes SKF</h4>
    <span class="ref">REF: RB-450-Z2</span>
  </div>
  <div class="stepper-control">
    <button class="stepper-btn" (click)="decrement()">-</button>
    <input type="number" inputmode="numeric" [value]="quantity" (change)="updateQuantity($event)">
    <button class="stepper-btn" (click)="increment()">+</button>
  </div>
  <button class="delete-btn" (click)="removeArticle()">
    <ion-icon name="trash-outline" color="danger"></ion-icon>
  </button>
</div>
```

## 5. Empty States

Composants affichés lorsqu'il n'y a pas de données ou en cas d'erreur réseau.

*   **Structure:** `<div>` centrée contenant une illustration SVG, un titre H2, un texte descriptif et un bouton d'action.
*   **Variantes:** "Aucune demande", "Serveur Indisponible".

```html
<!-- Exemple d'Empty State -->
<div class="empty-state">
  <img src="assets/svg/empty-box.svg" alt="Aucune demande" class="empty-illustration">
  <h2>Aucune demande</h2>
  <p class="text-muted">Vous n'avez aucune demande pour le moment.</p>
  <ion-button color="primary" fill="outline" routerLink="/stock/new">Créer une demande</ion-button>
</div>
```
# Design Tokens - Module de Gestion des Stocks ELYKIA

Ce document définit les fondations visuelles du module mobile de gestion des stocks, basées sur la charte "Enterprise SaaS Mobile" inspirée de la Fintech.

## Palette de Couleurs

La palette allie la confiance (bleus/indigos) à la clarté fonctionnelle (statuts).

| Rôle | Variable CSS | Valeur Hex | Utilisation |
|------|--------------|------------|-------------|
| **Primaire** | `--color-primary` | `#1E40AF` | Boutons principaux, onglets actifs, icônes clés |
| **Secondaire** | `--color-secondary` | `#64748B` | Éléments d'accentuation, dégradés subtils |
| **Fond App** | `--color-background` | `#F8FAFC` | Fond principal de l'application |
| **Surfaces** | `--color-surface` | `#FFFFFF` | Cartes, modales, bottom sheets |
| **Texte Principal** | `--color-text-primary` | `#0F172A` | Titres, texte principal, valeurs |
| **Texte Secondaire** | `--color-text-muted` | `#64748B` | Labels, sous-titres, placeholders |
| **Bordures** | `--color-border` | `#E2E8F0` | Séparateurs, bordures de cartes |

### Couleurs Sémantiques (Statuts)

| Statut | Fond (Light) | Texte (Dark) | Utilisation |
|--------|--------------|--------------|-------------|
| **En Attente / Créé** | `#FEF3C7` | `#D97706` | Statut `CREATED` |
| **Validé** | `#DBEAFE` | `#2563EB` | Statut `VALIDATED` |
| **Livré** | `#D1FAE5` | `#059669` | Statut `DELIVERED` |
| **Refusé / Annulé** | `#FEE2E2` | `#DC2626` | Statuts `REFUSED`, `CANCELLED` |

## Typographie

La police principale est **Plus Jakarta Sans** (ou **Inter** en fallback). Elle garantit une lisibilité maximale en extérieur.

*   **H1 (En-têtes) :** 24px, ExtraBold (800)
*   **H2 (Titres de section) :** 18px, Bold (700)
*   **Corps de texte :** 16px, Regular (400) - *Taille minimale pour éviter le zoom iOS*
*   **Labels et Badges :** 12px, SemiBold (600), Majuscules

## Formes et Élévation

Inspiré du Material Design adapté pour un rendu moderne.

*   **Rayon des Cartes / Modales :** `--radius-card` = `16px`
*   **Rayon des Boutons / Inputs :** `--radius-input` = `8px`
*   **Rayon des Badges / Boutons Pill :** `999px`
*   **Ombres des Cartes :** `0 4px 6px -1px rgba(79, 70, 229, 0.08)` (Ombres douces et colorées, pas de gris dur)
# Styling - Module de Gestion des Stocks ELYKIA

Ce document décrit les règles de styling pour le module mobile de gestion des stocks, en utilisant Ionic/Angular avec des variables CSS personnalisées.

## Approche Mobile-First

L'application est conçue pour des écrans tactiles de 375px à 430px de largeur. Le développement doit toujours privilégier l'expérience mobile.

## Variables CSS Globales (Ionic)

Les couleurs définies dans les Design Tokens doivent être intégrées dans le thème Ionic existant (`src/theme/variables.scss` ou `src/global.scss`) pour remplacer ou compléter les couleurs standards :

```css
:root {
  /* ELYKIA Mobile Stock Module Variables */
  --color-primary: #1E40AF;
  --color-secondary: #64748B;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text-primary: #0F172A;
  --color-text-muted: #64748B;
  --color-border: #E2E8F0;
  
  --radius-card: 16px;
  --radius-input: 8px;
  
  --shadow-card: 0 4px 6px -1px rgba(79, 70, 229, 0.08);
}
```

## Classes Utilitaires et SCSS

Le projet utilise SCSS. Bien que Tailwind ne soit pas mentionné comme étant installé par défaut, une approche orientée utilitaire est recommandée pour les marges, paddings et couleurs, en utilisant les classes utilitaires d'Ionic (`ion-padding`, `ion-margin`, `ion-text-center`, etc.).

Pour les styles spécifiques aux composants, utilisez le SCSS encapsulé (`@Component({ styleUrls: ['./my-component.scss'] })`).

## Styling des Données Financières

Pour l'affichage des montants (ex: `1,334.00 €`), utilisez une police à chasse fixe (monospace) ou assurez-vous que la police `Plus Jakarta Sans` utilise des chiffres tabulaires (`font-variant-numeric: tabular-nums;`) pour que les montants s'alignent correctement. Le poids de la police doit être gras (`font-weight: 700` ou `800`) et aligné à droite (`text-align: right`).

## États de Chargement (Skeletons)

L'approche "Online-First" requiert l'utilisation systématique de skeletons (`<ion-skeleton-text>`) pendant le chargement des données.

```html
<!-- Exemple de Skeleton pour une carte -->
<ion-card class="skeleton-card">
  <ion-card-content>
    <ion-skeleton-text animated style="width: 40%; height: 20px;"></ion-skeleton-text>
    <ion-skeleton-text animated style="width: 80%; height: 16px; margin-top: 8px;"></ion-skeleton-text>
    <ion-skeleton-text animated style="width: 60%; height: 16px; margin-top: 4px;"></ion-skeleton-text>
  </ion-card-content>
</ion-card>
```
