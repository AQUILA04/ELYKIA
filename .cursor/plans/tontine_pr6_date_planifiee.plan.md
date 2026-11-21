# PR 6/7 — Date de livraison planifiée et PDF des membres à livrer

Chantier « commande et livraison tontine » (plan général : `.cursor/plans/tontine_commande_livraison_7_pr.plan.md`).

## Besoin (point 6)

- À la création d'une commande tontine, choisir une date de livraison planifiée (optionnelle).
- Sur la page des livraisons (web), télécharger un PDF des membres à livrer pour la date choisie ; les membres déjà livrés n'y figurent pas.

## Livré

- Backend 1.63.0 : `V045` (`planned_delivery_date`), entité, DTO de création / réponse / liste / chargement mobile, fusion d'une seconde commande, reçu PDF, `TontinePlannedDeliveriesPdfService` + `GET /planned/pdf`, tests (service, rendu, reçu).
- Frontend 2.62.0 : date dans la fenêtre de préparation, colonne « Prévue le », « Membres à livrer le » + PDF, fiche membre.
- Mobile 2.48.0 : date dans la confirmation de commande, SQLite v39, synchro, chargements, fiche membre, reçu (aperçu, ticket), tests, e2e S2.
- Guide web et mobile, index RAG, HTML.

## Hors périmètre

- Modifier la date d'une commande existante.
- `schema-catalog.json` : la table `tontine_delivery` n'y est pas exposée.
