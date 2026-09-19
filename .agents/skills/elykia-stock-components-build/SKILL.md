---
name: elykia-stock-components-build
description: >
  Guide de construction des composants UI/UX pour le module mobile de gestion des stocks ELYKIA (Angular/Ionic).
  Ce skill définit les tokens de design, les règles de styling, la structure des composants et les normes d'accessibilité.
license: MIT
---

# ELYKIA Stock Module - Components Build Skill

Ce skill fournit un ensemble complet de directives pour le développement de l'interface utilisateur du module de gestion des stocks de l'application mobile ELYKIA. Il est destiné aux agents de développement frontend travaillant avec Angular et Ionic, garantissant une implémentation fidèle aux spécifications visuelles "Mobile-First" et "Enterprise SaaS Mobile".

## Table des Matières

1.  [Design Tokens](rules/design-tokens.md) : Couleurs, typographie, formes et élévation.
2.  [Styling](rules/styling.md) : Approche Mobile-First, variables CSS Ionic, et gestion des états.
3.  [Composants UI](rules/components.md) : Structure et implémentation des composants clés (Header, Badges, Cartes, Répéteur).
4.  [Accessibilité (A11y)](rules/accessibility.md) : Règles pour les zones de clic, le contraste, les icônes et les formulaires.

## Référence Rapide

### Variables CSS Principales (à injecter dans le thème Ionic)

```css
:root {
  --color-primary: #1E40AF;
  --color-secondary: #64748B;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text-primary: #0F172A;
  --color-text-muted: #64748B;
  --color-border: #E2E8F0;
  
  --radius-card: 16px;
  --radius-input: 8px;
}
```

### Typographie

*   Police : **Plus Jakarta Sans** (ou Inter).
*   Tailles clés : H1 (24px, ExtraBold), H2 (18px, Bold), Corps (16px, Regular), Labels (12px, SemiBold).

### Principes Fondamentaux

1.  **Mobile-First :** Zones de clic de 44x44px minimum, polices lisibles (min 16px pour le corps).
2.  **Online-First (Perçu) :** Utilisation systématique de Skeletons (`<ion-skeleton-text>`) pendant les chargements réseau.
3.  **Statuts Clairs :** Badges colorés (ex: `#FEF3C7` pour "En Attente", `#D1FAE5` pour "Livré").
4.  **Architecture Angular :** Utilisation stricte de `standalone: false` pour les composants.
