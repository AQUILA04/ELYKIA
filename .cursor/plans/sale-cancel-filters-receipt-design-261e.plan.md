# Plan — filtres annulation + design reçu de commande

## Objectifs

1. Page **Annulation Ventes** : recherche + filtre commercial + période (date début / fin) sur l’historique.
2. **Reçu de commande** : aligner sur `elykia-document-design` ; code d’authenticité **discret** (coin pied de page).

## Réalisé

- Backend : `searchRuns` + params optionnels sur `GET /runs`.
- Frontend : toolbar historique (`app-commercial-selector`, dates, recherche).
- PDF tontine + aperçus mobile + ticket thermique + maquette skill.
- Guide, index RAG, `frontend/src/user-guide/`, changelog, versions.
