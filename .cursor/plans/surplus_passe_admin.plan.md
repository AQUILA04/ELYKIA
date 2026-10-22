# Équilibrer un surplus vers un manque passé

## Constats

Le bouton est masqué pour l’admin alors que le serveur l’accepte déjà. Dans `CashSurplusReallocationService`, `assertCanReallocate` autorise gestionnaire, secrétaire et `ADMIN`. Dans `daily-report.component.ts`, `canReallocateSurplus` ne teste que `isManager || isSecretary`.

L’équilibrage ne regarde que la période filtrée. Un surplus aujourd’hui avec un reste à 0 ne propose rien, même si un jour antérieur a encore un manque. Et quand la période contient les deux jours, le montant est reclassé sur le versement du jour du surplus : la fiche du jour en manque, ouverte seule, garde son reste.

## Règles retenues

- Profils : gestionnaire, secrétaire, admin et super-admin, à l’écran et sur le serveur.
- L’argent déplacé est uniquement le surplus non catégorisé de la période affichée.
- Les manques visés sont ceux du même commercial, du plus ancien jour jusqu’à la fin de la période, y compris les jours antérieurs au filtre. Sur chaque jour : crédit, puis tontine, puis solde. Un jour passé est soldé avant un jour plus récent, y compris aujourd’hui.
- Le reste du jour passé diminue vraiment. Le total versé de ce jour ne change pas : l’argent a été encaissé le jour du surplus.
- Un jour déjà constitué en écart de caisse (dette jour non annulée) est ignoré. Ce manque se règle dans Dettes, pas par un deuxième équilibrage.
- Le total versé de la période ne change pas. Seul le classement du surplus change.

## Données

Migration `V020` :

- Sur `daily_commercial_report` : `surplus_coverage_credit`, `surplus_coverage_tontine`, `surplus_coverage_new_balance` (défaut 0).
- Sur `cash_surplus_reallocation_line` : `target_date`.

Le versement du jour source voit son surplus baisser et la catégorie monter, pour que crédit + tontine + solde + surplus reste égal au montant. Ces montants qui couvrent un autre jour ne sont pas ajoutés au « versé catégorie » du jour source. Ils augmentent la couverture du jour cible.

Reste d’un jour = à verser − versé catégorie − couverture. Une période qui contient la source et la cible ne compte le montant qu’une fois, via la couverture du jour cible.

## Backend

Dans `CashSurplusReallocationService` :

- Étendre `assertCanReallocate` à `SUPER_ADMIN`.
- Charger les rapports du commercial jusqu’à `periodEnd`, pas seulement entre les deux dates du filtre.
- Calculer les manques jour par jour, hors jours ayant une dette de caisse active.
- Consommer les versements à surplus de la période filtrée, du plus ancien dépôt au plus récent, vers les jours cibles du plus ancien au plus récent.
- Écrire une ligne d’audit par couple versement / jour couvert.
- Mettre à jour la couverture des rapports cibles et le surplus du rapport source.
- Journal : mentionner les dates couvertes.

Nouvel aperçu en lecture seule, même calcul, sans écriture : `GET /api/cash-deposits/reallocate-surplus/preview`. Le `POST` existant réutilise ce calcul.

Après le chargement des rapports agrégés, un total de manque antérieur à `periodStart` par commercial. Champ `historicalRemaining` renvoyé avec le rapport.

Mettre à jour le constructeur JPQL et les `SUM` de `DailyCommercialReportRepository`, le catalogue `schema-catalog.json` pour les trois colonnes de couverture, et les tests (cas existant + surplus du jour qui couvre une date antérieure au filtre).

## Écran

Dans `daily-report.component.ts` et `daily-commercial-report.model.ts` :

- `canReallocateSurplus` : gestionnaire, secrétaire, admin ou super-admin, surplus de la fiche > 0, et reste de la fiche ou manque antérieur > 0.
- Au clic, appeler l’aperçu serveur puis `showConfirmation`, avec les dates couvertes.
- Sous chaque catégorie, si la couverture est > 0 : « dont couvert par surplus : … ». Le reste affiché en tient compte. Le total versé reste celui encaissé ce jour-là.
- La mention d’audit sur la fiche cite les dates couvertes.

## Guide et version

Mettre à jour `user-guide/docs/manager/reporting_config.md` : le bouton est aussi pour l’admin ; un surplus peut couvrir un manque plus ancien du commercial ; le reste de ce jour baisse, le versé de ce jour non. Puis régénérer l’index RAG et le guide HTML, et tracer le changement dans `docs/CHANGELOG.md`.
