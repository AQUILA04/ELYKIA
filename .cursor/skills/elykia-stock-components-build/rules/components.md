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
