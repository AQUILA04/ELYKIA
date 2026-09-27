# Plan : Empty state tontine → Rejoindre la session

## Objectif

Remplacer l’empty state « Aucune tontine active » de l’Espace Client par un parcours d’inscription immédiat à la session tontine ouverte (mise journalière + paiement initial facultatif), avec identification backend des membres auto-inscrits.

## Décisions produit

- Inscription immédiate (pas d’approbation staff) ; seul le paiement Mobile Money optionnel est validé via le flux existant « Cotisations tontine ».
- Mise libre, minimum 100 FCFA, raccourcis 100 / 200 / 500 / 1 000.
- `getActiveSession()` ne doit pas être appelé depuis les endpoints de lecture client (auto-création).

## Périmètre livré

### Backend

- Enum `TontineMemberRegistrationSource` + colonne `registration_source` (Flyway V003).
- Overload `registerMember(dto, source)` ; STAFF par défaut.
- Endpoints customer : session courante, recipients join, POST join.
- Schema catalog IA synchronisé.

### Customer-space

- Refonte `tontines.page` (Type C hero) + page `tontine-join`.
- Composants partagés : `elyk-page-header`, `mobile-money-recipients-card`.
- Design system v2 tokens + classes globales (pilote tontine).

### Docs

- Guide `user-guide/docs/customer/tontine.md` + nav MkDocs.
- Màj commercial/tontine + manager/operations.
- Index RAG régénéré.

## Versions

- Customer-space `0.5.1` → `0.6.0`
- Backend `1.20.1` → `1.21.0`
