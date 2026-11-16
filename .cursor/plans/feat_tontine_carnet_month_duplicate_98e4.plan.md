# Plan — Doublon carnet multi-commerciaux (même mois)

## Décisions produit

1. Bouton **+** uniquement sur un mois avec `systemAmount > 0`.
2. Au plus **2** lignes carnet additionnelles (3 lignes max / mois calendaire).
3. Mobile first ; pas d’UI web pour cette tâche.

## Backend

- Relâcher `assertMonthAttribution` : autoriser des commerciaux à système 0 sur un mois déjà cotisé.
- Cap serveur : max 2 lignes à système ≈ 0 lorsque le total membre du mois > 0.
- Mois totalement vide : toujours 1 seul commercial.
- Doublon même commercial|année|mois : toujours rejeté.

## Mobile

- Helpers : `canAddExtraCarnetRow`, `countCalendarMonthRows`, `commercialsUsedOnMonth`, flag `duplicatedFromSystemMonth`.
- Sheet : **+** / corbeille, commercial requis distinct, mise figée, insert adjacent.
- Conserver `omitClaimedEmptyMonthRows` (pas de stubs grisés).

## Docs

- Guide RM mobile : mention du **+** et des lignes carnet additionnelles.
- Changelog + versions Mobile / Backend.
