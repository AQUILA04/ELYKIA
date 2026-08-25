---
name: Client selector DS
overview: Restyler la modal partagée `client-selector-modal` avec le design system Elykia (navy, cartes, search) poussé au-delà du shell RM, sans changer la logique de sélection ni les appels existants.
todos:
  - id: selector-ui
    content: Restyler HTML/SCSS client-selector-modal (hero navy, search, cartes, états)
    status: completed
  - id: selector-avatar
    content: Remplacer getAvatarColor arc-en-ciel par nuances navy
    status: completed
  - id: selector-version
    content: Bump mobile 2.23.1 + CHANGELOG
    status: completed
isProject: false
---

# Restyle client-selector (DS Elykia)

## Contexte

[`client-selector-modal`](mobile/src/app/shared/components/client-selector-modal/) est la modal partagée ouverte depuis recouvrement, distributions, commandes et tontine. UI actuelle : Material blue `#1976d2`, header gris, avatars multicolores aléatoires, lignes plates.

Alignement sur le DS déjà en place (`elyk-ds.scss`) : navy, search overlap, cartes clientes, avatars navy-pale carrés arrondis — **mieux que le RM plat**, pas une copie.

## Périmètre

- HTML + SCSS de [`client-selector-modal.component.html`](mobile/src/app/shared/components/client-selector-modal/client-selector-modal.component.html) / [`.scss`](mobile/src/app/shared/components/client-selector-modal/client-selector-modal.component.scss)
- Ajustement léger de [`getAvatarColor`](mobile/src/app/shared/components/client-selector-modal/client-selector-modal.component.ts) pour une palette navy (plus de pastilles arc-en-ciel)
- Version mobile **PATCH** `2.23.0` → `2.23.1` + CHANGELOG

**Inchangé** : `selectClient` / `dismiss` / search / pagination store / `filterByTontineCollector` / `cssClass: 'client-selector-modal'` chez les callers / `cdk-virtual-scroll`.

## Design cible

| Zone | Traitement |
|------|------------|
| Header | Hero navy compact (glow/grain comme `.elyk-hero`), surtitre `Portefeuille`, titre `Sélectionner un client`, bouton close glass blanc |
| Search | `.elyk-searchbar` en overlap sous le hero |
| Lignes | Cartes style `.elyk-client-card` : avatar rounded-square navy-pale + initiales, nom 700, adresse/tél muted, meta, chevron |
| États | Loading / empty / erreur avec tokens `--elyk-*` et CTA outline navy |
| Compteur | Footer discret muted + tabular |
| Backdrop | Blur conservé, teinte navy légère `rgba(0,51,102,.45)` |

Pas de nouveaux composants Angular ; réutiliser les classes DS globales où c’est direct.

## Livrables

1. Restyle HTML/SCSS modal
2. Palette avatar navy (variantes pale / mid dérivées de `#003366`)
3. Bump `2.23.1` (3 fichiers) + entrée CHANGELOG Mobile
