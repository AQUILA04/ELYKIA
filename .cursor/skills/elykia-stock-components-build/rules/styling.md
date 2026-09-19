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
