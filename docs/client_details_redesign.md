# Redesign de la page Détails Client

## Objectif
Restructurer la page `client-details.component.html` pour en faire une vue complète et centralisée des informations du client, intégrant les données personnelles, un résumé des opérations, l'historique des achats (crédits) et les dernières cotisations.

## Structure Proposée

La nouvelle page sera divisée en plusieurs sections distinctes pour une meilleure lisibilité et organisation.

### 1. En-tête (Header)
*   **Titre** : "Détails du Client"
*   **Actions Globales** : Boutons pour "Modifier", "Retour à la liste".

### 2. Résumé des Opérations (Dashboard Rapide)
Cette section reprendra les indicateurs clés actuellement présents dans `client-view.component.html`.
*   **Disposition** : Cartes ou grille (Grid) en haut de page.
*   **Données à afficher** :
    *   Achats en cours (Nombre & Montant total)
    *   Montant total dû à date
    *   Montant total payé à date
    *   Achats terminés
    *   Achats en retard

### 3. Informations Personnelles (Collapsible / Card)
Cette section regroupera les informations d'identification et de contact. Elle peut être repliable ou présentée sous forme de carte pour ne pas encombrer la vue si l'utilisateur souhaite se concentrer sur les opérations.
*   **Photo de profil**
*   **Données** : Nom, Prénom, Téléphone, Adresse, Occupation, Agent associé, N° Compte, etc.
*   **Action** : Bouton "Modifier" (icône crayon) accessible directement ici.

### 4. Contenu Principal (Onglets / Tabs)
Pour gérer la densité d'informations (Achats et Cotisations), l'utilisation d'onglets (`mat-tab-group`) est recommandée.

#### Onglet A : Historique des Achats (Crédits)
*   **Format** : Liste ou Tableau avec fonctionnalité d'expansion (`mat-expansion-panel` ou `mat-table` avec `multiTemplateDataRows`).
*   **Vue Résumée (Ligne du tableau)** :
    *   Référence du crédit
    *   Date de création
    *   Montant Total
    *   Montant Payé / Restant
    *   Statut (Badge couleur)
*   **Vue Détaillée (Expandable)** :
    *   **Sous-section 1 : Articles achetés**
        *   Tableau simple : Nom article, Quantité, Prix unitaire, Total ligne.
    *   **Sous-section 2 : Historique des paiements (Cotisations liées)**
        *   Liste des paiements spécifiques à ce crédit (Date, Montant).

#### Onglet B : Dernières Cotisations (Global)
*   **Source** : `CreditTimeline.java` (Backend).
*   **Format** : Tableau chronologique des 30 dernières transactions.
*   **Colonnes** :
    *   Date
    *   Type (Dépôt/Retrait/Paiement)
    *   Montant
    *   Référence Crédit (Lien cliquable vers le détail du crédit si applicable)
    *   Agent (Celui qui a perçu)

## Maquette HTML (Structure Conceptuelle)

```html
<div class="container client-details-page">

  <!-- 1. Header & Actions -->
  <div class="page-header d-flex justify-content-between align-items-center mb-4">
    <h1>{{ client.firstname }} {{ client.lastname }}</h1>
    <div class="actions">
      <button mat-stroked-button (click)="onCancel()">Retour</button>
      <button mat-raised-button color="primary" (click)="navigateToEdit(client.id)">
        <mat-icon>edit</mat-icon> Modifier
      </button>
    </div>
  </div>

  <!-- 2. Résumé des Opérations (KPIs) -->
  <div class="kpi-dashboard row mb-4">
    <div class="col-md-3">
      <mat-card class="kpi-card">
        <mat-card-subtitle>Achats en cours</mat-card-subtitle>
        <mat-card-title>{{ clientDetails.totalInProgressCredit }}</mat-card-title>
        <mat-card-content>{{ clientDetails.totalInProgressCreditAmount | currency }}</mat-card-content>
      </mat-card>
    </div>
    <div class="col-md-3">
      <mat-card class="kpi-card">
        <mat-card-subtitle>Reste à payer</mat-card-subtitle>
        <mat-card-title class="text-danger">{{ clientDetails.totalInProgressAmountDue | currency }}</mat-card-title>
      </mat-card>
    </div>
    <!-- Autres KPIs... -->
  </div>

  <div class="row">
    <!-- 3. Informations Personnelles (Sidebar ou Colonne Gauche) -->
    <div class="col-md-4 mb-4">
      <mat-card class="profile-card">
        <mat-card-header>
          <div mat-card-avatar class="profile-header-image" [style.backgroundImage]="'url(' + safeProfilPhotoUrl + ')'"></div>
          <mat-card-title>Infos Personnelles</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-list>
            <mat-list-item>
              <mat-icon mat-list-icon>phone</mat-icon>
              <div mat-line>{{ client.phone }}</div>
            </mat-list-item>
            <mat-list-item>
              <mat-icon mat-list-icon>location_on</mat-icon>
              <div mat-line>{{ client.address }}</div>
            </mat-list-item>
            <!-- Autres détails... -->
          </mat-list>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- 4. Contenu Principal (Onglets Droite) -->
    <div class="col-md-8">
      <mat-tab-group animationDuration="0ms">
        
        <!-- Onglet Achats (Expandable) -->
        <mat-tab label="Historique des Achats">
          <div class="tab-content p-3">
            <mat-accordion multi>
              <mat-expansion-panel *ngFor="let credit of credits">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    {{ credit.reference }}
                  </mat-panel-title>
                  <mat-panel-description>
                    {{ credit.totalAmount | currency }} - 
                    <span [class]="'badge ' + getStatusClass(credit.status)">{{ credit.status }}</span>
                  </mat-panel-description>
                </mat-expansion-panel-header>

                <!-- Détail Crédit : Articles -->
                <div class="articles-section mt-2">
                  <h6>Articles</h6>
                  <table class="table table-sm">
                    <!-- ... -->
                  </table>
                </div>

                <!-- Détail Crédit : Paiements -->
                <div class="payments-section mt-2">
                  <h6>Paiements reçus</h6>
                  <!-- ... -->
                </div>

              </mat-expansion-panel>
            </mat-accordion>
          </div>
        </mat-tab>

        <!-- Onglet Dernières Cotisations -->
        <mat-tab label="30 Dernières Cotisations">
          <div class="tab-content p-3">
            <table mat-table [dataSource]="lastCotisations" class="w-100">
              <!-- Colonnes Date, Montant, Type, Agent... -->
            </table>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  </div>
</div>
```

## Étapes d'implémentation
1.  **Backend** : S'assurer que les endpoints nécessaires existent.
    *   Récupération des détails étendus du client (KPIs).
    *   Récupération de la liste des crédits avec leurs détails (articles, paiements) ou chargement lazy.
    *   Endpoint pour les 30 dernières cotisations (`CreditTimeline`).
2.  **Frontend (TS)** :
    *   Mettre à jour `ClientDetailsComponent` pour charger `clientDetails` (KPIs), `credits` (liste complète) et `cotisations`.
    *   Gérer la logique d'expansion des crédits (si chargement lazy des détails).
3.  **Frontend (HTML/CSS)** :
    *   Intégrer la structure HTML ci-dessus.
    *   Appliquer les styles (Angular Material, Bootstrap grid).

