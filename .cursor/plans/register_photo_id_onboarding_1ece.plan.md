# Plan — Inscription : photo UI + pièce à l'onboarding

## Objectif

- Remplacer l'input fichier natif « Choisir un fichier » par un sélecteur photo soigné.
- Retirer type / numéro de pièce de la 1re phase d'inscription ; les collecter uniquement dans **Mon dossier**.

## Changements

- [x] `auth.page` : photo picker + sans cardType/cardID
- [x] `onboarding.page` : type/numéro requis + picker photo aligné
- [x] Backend `CustomerRegisterRequest` / `CustomerRegistrationService` : pièce optionnelle
- [x] E2E + guide manager + changelog
