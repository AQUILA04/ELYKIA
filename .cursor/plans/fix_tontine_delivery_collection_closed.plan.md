# Fix — collecte à la livraison en session CLOSED

## Problème

Sur mobile, l’écran `collection-recording` refusait **toute** collecte dès que la session était `CLOSED`, y compris le flux **Compléter le solde** (`returnToDelivery=true` → `isDeliveryCollection`).

## Règles métier attendues

| Flux | ACTIVE | CLOSED | ENDED |
|------|--------|--------|-------|
| Cotisation normale (fiche membre) | oui | non | non |
| Collecte à la livraison / Compléter le solde | oui | oui | non |

## Correctifs

- Mobile : autoriser le complément si `returnToDelivery` et session `ACTIVE`/`CLOSED` ; bloquer seulement `ENDED`
- Mobile : masquer **Cotiser** / **Enregistrer une cotisation** dès `CLOSED`
- Backend : déjà conforme ; tests unitaires de non-régression ajoutés
- Guide commercial mobile aligné

## Versions

- Mobile 2.40.2
- Backend 1.53.3
