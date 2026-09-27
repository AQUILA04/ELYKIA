# Clients et membres auto-inscrits dans le back-office

Branche : `cursor/tontine-empty-state-rejoindre-a430`.

## Livré

- Enum `ClientRegistrationSource` + colonne `registration_source` (V004) sur `client`, défaut STAFF, `CUSTOMER_SPACE` à l'auto-inscription.
- `ClientRespDto.registrationSource` + filtre sur listes clients et membres tontine.
- Frontend : filtre Origine + badges sur liste/fiches client et dashboard/fiche membre tontine.
- Guide utilisateur + index RAG + changelog (Frontend 2.24.0, Backend 1.21.0).
