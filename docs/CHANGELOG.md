# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Sections are ordered **descending by date**: most recent at the top, oldest at the bottom.
`[Unreleased]` always appears first, immediately after this header.

## [Unreleased]

### Added

- **Docs —** skill Cursor `.cursor/skills/keep-changelog/` — impose la mise à jour du changelog après chaque tâche agent (équivalent projet de `.agent/skills/keep-changelog/`).
- **Backend —** endpoint `PATCH /api/v1/clients/info-update` pour la mise à jour des informations client depuis le mobile, sans toucher aux photos.
- **Mobile —** synchronisation des fiches client modifiées (`updatedInfo`) via le nouvel endpoint, distincte des flux photo et localisation.

### Changed

- **Mobile —** édition complète d'un client déjà synchronisé : formulaire sans photos (gérées via le menu dédié), avec synchronisation différée des informations texte.
- **Backend —** `PUT /api/v1/clients/{id}` : préservation des photos et URLs si le corps de requête ne les fournit pas.

### Fixed

- **Mobile —** correction de l'écrasement de l'état `isLocal`/`isSync` lors de la modification d'un client synchronisé.

## [2026-06-09]

### Added

- `docs/CHANGELOG.md` — journal des modifications du monorepo ELYKIA (format Keep a Changelog).
- Skill `.agent/skills/keep-changelog/` — impose la mise à jour du changelog après chaque tâche agent.

### Changed

- **Mobile — initialisation clients** : purge conservatrice des clients synchronisés (`ClientRepository.deleteSyncedForReinit`) déclenchée après le succès de la première page API, avant l'insertion paginée ; préserve les clients locaux non synchronisés et ceux avec modifications en attente (`updated`, `updatedPhoto`, `updatedPhotoUrl`).
- **Mobile — initialisation comptes** : même stratégie de purge conservatrice (`AccountRepository.deleteSyncedForReinit`) et fetch paginé (20 éléments/page) à la place d'un chargement unique de 2000 comptes.
- **Docs —** convention d'ordre descendant des sections du changelog (date la plus récente en haut).

### Fixed

- **Mobile — données clients/comptes obsolètes** : suppression des entités synchronisées « fantômes » ou périmées lors de la ré-initialisation quotidienne, afin de refléter la dernière version serveur sans charger l'intégralité des clients en mémoire.
