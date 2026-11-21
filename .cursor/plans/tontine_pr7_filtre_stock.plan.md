# PR 7/7 — Filtre stock / catalogue et réservation indicative

Chantier « commande et livraison tontine » (plan général : `.cursor/plans/tontine_commande_livraison_7_pr.plan.md`).

## Besoin (point 7)

- À la création d'une commande : filtre rapide « articles du stock tontine du commercial » ou « catalogue général ».
- Une commande prise dans le stock ne le débite pas ; on affiche ce qui est déjà réservé et la différence (libre) pour opérer sur le terrain. Indicatif, pas bloquant.
- À la remise : uniquement le stock du commercial (il est débité).

## Livré

- Backend 1.62.0 : `TontineArticleReservationDto`, `TontineDeliveryRepository.reservedQuantitiesByArticle`, `TontineStockReservationService`, `GET /reservations`, tests (unitaire + PostgreSQL).
- Mobile 2.47.0 : `articleSource` (filtre en session ouverte et clôturée), `reservedQuantitiesByArticle` en SQLite, Réservé / Libre sur les cartes du stock, tests.
- Frontend 2.61.0 : filtre et tableau du stock dans « Préparer la Livraison », `buildStockArticleRows`, spec typée.
- Guide web et mobile, index RAG, HTML.

## Limites

- Mobile : la réservation est calculée sur les commandes présentes sur le téléphone (celles des autres appareils arrivent à la synchronisation).
- Web : spec non exécutée (Karma ne compile pas sur le dépôt).
