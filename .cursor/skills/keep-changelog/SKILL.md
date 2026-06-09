---
name: keep-changelog
description: >
  Met à jour docs/CHANGELOG.md au format Keep a Changelog après chaque tâche
  qui modifie le code, la configuration ou la documentation du projet ELYKIA.
  À appliquer systématiquement en fin de tâche (implémentation, correctif, refactor,
  docs techniques) avant de répondre à l'utilisateur. Ne pas ignorer même si
  l'utilisateur ne le demande pas explicitement.
---

# Keep Changelog — ELYKIA

## Règle obligatoire

**Après l'exécution de toute tâche** qui produit un changement notable dans le dépôt, mettre à jour `docs/CHANGELOG.md` **avant** de conclure la réponse à l'utilisateur.

Exceptions (pas de mise à jour requise) :

- Question purement informative sans modification de fichiers
- Revue ou analyse en lecture seule
- Tâche annulée ou bloquée sans aucun changement livré

## Fichier cible

```
docs/CHANGELOG.md
```

## Format (Keep a Changelog)

1. Conserver l'en-tête et les liens vers Keep a Changelog / SemVer.
2. **Ordre descendant des sections** : la date la plus récente en haut du fichier, la plus ancienne en bas. Structure typique :
   - En-tête
   - `## [Unreleased]` (toujours en premier, juste après l'en-tête)
   - `## [YYYY-MM-DD]` du jour le plus récent
   - `## [YYYY-MM-DD]` des jours précédents, du plus récent au plus ancien
3. Lorsqu'une nouvelle date est ajoutée, insérer sa section **au-dessus** des sections datées plus anciennes (jamais en bas du fichier).
4. Lorsqu'une date est close ou demandée explicitement, créer ou compléter une section **`## [YYYY-MM-DD]`** (ex. `## [2026-06-09]`).
5. Classer chaque entrée sous **une seule** catégorie :

| Catégorie   | Usage |
|-------------|-------|
| `Added`     | Nouvelles fonctionnalités, fichiers, skills, endpoints |
| `Changed`   | Comportement modifié d'une fonctionnalité existante |
| `Deprecated`| Fonctionnalités bientôt supprimées |
| `Removed`   | Fonctionnalités ou fichiers supprimés |
| `Fixed`     | Corrections de bugs |
| `Security`  | Correctifs de vulnérabilités |

6. Préfixer les entrées multi-composants : **`Mobile —`**, **`Backend —`**, **`Frontend —`**, **`Docs —`**.
7. Rédiger en français, phrases complètes, orientées impact utilisateur ou métier.
8. Une puce = un changement logique ; ne pas lister chaque fichier individuellement sauf si pertinent.

## Workflow en fin de tâche

```
- [ ] Changements livrés dans le dépôt ?
- [ ] Lire docs/CHANGELOG.md
- [ ] Ajouter ou compléter les entrées sous [Unreleased] (date du jour si section datée utilisée)
- [ ] Vérifier catégorie, préfixe composant et clarté de la formulation
- [ ] Vérifier l'ordre descendant des sections (récent en haut, ancien en bas)
- [ ] Ne pas dupliquer une entrée déjà présente pour le même changement
```

## Exemples d'entrées

```markdown
### Added

- **Mobile —** écran de validation des collectes tontine avec pastilles de statut.

### Changed

- **Backend —** endpoint `/api/v1/clients` : pagination par défaut portée à 50 éléments.

### Fixed

- **Mobile —** initialisation clients : purge des enregistrements synchronisés obsolètes avant ré-import paginé.
```

## Anti-patterns

- Oublier le changelog parce que l'utilisateur ne l'a pas mentionné
- Mélanger plusieurs changements non liés dans une seule puce
- Utiliser du jargon interne (noms de méthodes, identifiants SQL) sans contexte métier
- Créer un changelog séparé ailleurs que `docs/CHANGELOG.md`
- Ajouter une nouvelle section datée en bas du fichier (toujours insérer au-dessus des dates plus anciennes)
