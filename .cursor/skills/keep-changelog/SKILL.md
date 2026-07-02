---
name: keep-changelog
description: >
  Met à jour docs/CHANGELOG.md au format Keep a Changelog après chaque tâche
  qui modifie le code, la configuration ou la documentation du projet ELYKIA.
  Chaque composant (Frontend, Mobile, Customer-space, Backend) a sa propre
  section versionnée, alignée sur package.json ou pom.xml. À appliquer
  systématiquement en fin de tâche avant de répondre à l'utilisateur.
---

# Keep Changelog — ELYKIA

## Règle obligatoire

**Après l'exécution de toute tâche** qui produit un changement notable dans le dépôt :

1. **Incrémenter la version** du ou des composants touchés (voir tableau ci-dessous).
2. **Documenter** le changement dans `docs/CHANGELOG.md` sous la section de version correspondante.

Exceptions (pas de mise à jour requise) :

- Question purement informative sans modification de fichiers
- Revue ou analyse en lecture seule
- Tâche annulée ou bloquée sans aucun changement livré

## Sources de version par composant

| Composant | Fichier source | Champ |
|-----------|----------------|-------|
| **Frontend** | `frontend/package.json` | `"version"` |
| **Mobile** | `mobile/package.json` (+ `environment.ts`, `environment.prod.ts`) | `"version"` / `version` — voir skill **mobile-version-bump** |
| **Customer-space** | `customer-space/package.json` | `"version"` |
| **Backend** | `backend/pom.xml` | `<version>` du projet (`optimize-elykia-core`, pas le parent Spring Boot) |

La version affichée dans le changelog **doit toujours correspondre** à la valeur lue dans le fichier source après incrément.

## Règles d'incrément SemVer

Format `MAJEUR.MINEUR.PATCH` (ex. `2.9.2`, `1.0.1`).

| Type de changement | Incrément | Exemple Frontend |
|--------------------|-----------|------------------|
| Correctif, refactor, tests, config, petit ajout UI | **PATCH** | `2.9.1` → `2.9.2` |
| Nouvelle fonctionnalité, écran majeur, refonte de flux | **MINEUR** (patch → `0`) | `2.9.5` → `2.10.0` |
| Rupture incompatible (rare, explicite) | **MAJEUR** | `2.10.3` → `3.0.0` |

**Par défaut : PATCH.** Passer en mineur seulement pour une fonctionnalité substantielle visible par l'utilisateur.

- **Mobile** : appliquer le skill **mobile-version-bump** (mêmes règles PATCH / MINEUR).
- **Backend** : incrémenter `backend/pom.xml` selon les mêmes règles SemVer (`1.0.0` → `1.0.1` patch, `1.0.1` → `1.1.0` mineur).
- **Customer-space** : même logique SemVer sur `customer-space/package.json` (phase initiale `0.0.x` → `0.1.0` pour une feature large).

## Fichier cible

```
docs/CHANGELOG.md
```

## Structure du changelog (monorepo versionné)

**Ne plus accumuler les changements sous `[Unreleased]`.** Chaque livraison est rattachée à la version du composant concerné.

### En-tête

Conserver l'en-tête Keep a Changelog / SemVer. Remplacer la mention `[Unreleased]` par une note indiquant que les sections sont **ordonnées par composant**, versions **décroissantes** (la plus récente en haut de chaque bloc).

### Titres de section

```markdown
## Frontend — [2.9.2] — 2026-07-02

## Mobile — [2.10.1] — 2026-07-01

## Backend — [1.0.1] — 2026-06-28

## Customer-space — [0.0.2] — 2026-06-20

## Docs & Infra
```

- Format : `## <Composant> — [X.Y.Z] — YYYY-MM-DD`
- **Date** = date du jour lors de la première entrée de cette version (ne pas la modifier si la section existe déjà).
- **Ordre global** : blocs composant regroupés ; au sein d'un composant, versions décroissantes (récente en haut).
- Lors d'un nouvel incrément, **créer une nouvelle section** en tête du bloc composant (au-dessus des versions plus anciennes du même composant).
- Changements transverses (CI/CD, deploy, skills Cursor, docs racine) : section **`## Docs & Infra`** sans version, ou sous le composant principal impacté si un seul est concerné.

### Catégories (sous chaque section version)

| Catégorie   | Usage |
|-------------|-------|
| `Added`     | Nouvelles fonctionnalités, fichiers, skills, endpoints |
| `Changed`   | Comportement modifié d'une fonctionnalité existante |
| `Deprecated`| Fonctionnalités bientôt supprimées |
| `Removed`   | Fonctionnalités ou fichiers supprimés |
| `Fixed`     | Corrections de bugs |
| `Security`  | Correctifs de vulnérabilités |

### Rédaction

1. **Ne pas préfixer** par le nom du composant dans la puce si la section l'indique déjà (`## Frontend — [2.9.2]` → `- sélection clients paginée…`, pas `- **Frontend —** …`).
2. Pour une section **Docs & Infra** ou un changement multi-composants dans une section unique, conserver le préfixe : **`Mobile —`**, **`Backend —`**, **`Frontend —`**, **`Deploy —`**, **`Docs —`**.
3. Rédiger en français, phrases complètes, orientées impact utilisateur ou métier.
4. Une puce = un changement logique.

## Workflow en fin de tâche

```
- [ ] Changements livrés dans le dépôt ?
- [ ] Identifier le(s) composant(s) touché(s) : frontend/, mobile/, customer-space/, backend/, docs/infra
- [ ] Lire la version actuelle dans package.json ou pom.xml
- [ ] Choisir PATCH (défaut) ou MINEUR (feature large) et incrémenter le fichier source
- [ ] Mobile : appliquer mobile-version-bump (3 fichiers)
- [ ] Lire docs/CHANGELOG.md
- [ ] Créer ou compléter la section ## <Composant> — [nouvelle version] — YYYY-MM-DD
- [ ] Ajouter l'entrée sous la bonne catégorie (Added / Changed / Fixed / …)
- [ ] Vérifier que la version du changelog = version du fichier source
- [ ] Vérifier l'ordre (version récente en haut du bloc composant)
- [ ] Ne pas dupliquer une entrée déjà présente pour le même changement
```

## Exemples

**Correctif frontend (patch + changelog) :**

- `frontend/package.json` : `2.9.1` → `2.9.2`
- Changelog :

```markdown
## Frontend — [2.9.2] — 2026-07-02

### Fixed

- `ClientSelectComponent` : annulation des requêtes HTTP paginées à la destruction du composant.
```

**Feature backend (mineur) :**

- `backend/pom.xml` : `1.0.0` → `1.1.0`
- Changelog :

```markdown
## Backend — [1.1.0] — 2026-07-02

### Added

- Module Elykia IA : orchestrateur dual pipeline Text-to-SQL + RAG, API `/api/v1/ai/*`.
```

**Mobile (déléguer l'incrément, documenter la version courante) :**

```markdown
## Mobile — [2.10.1] — 2026-07-02

### Added

- Contrôle des appareils autorisés au login (`X-Device-Id`, registre admin).
```

## Migration depuis `[Unreleased]`

Si `docs/CHANGELOG.md` contient encore une section `[Unreleased]` :

1. Répartir chaque entrée dans la section versionnée du composant concerné (selon le préfixe `Frontend —`, `Backend —`, etc.).
2. Utiliser la version **actuelle** du fichier source du composant, ou incrémenter si la tâche en cours ajoute un nouveau changement.
3. Supprimer `[Unreleased]` une fois le contenu migré.

## Anti-patterns

- Laisser tout sous `[Unreleased]` au lieu de versionner par composant
- Documenter une version dans le changelog sans l'incrémenter dans `package.json` / `pom.xml`
- Versions désynchronisées entre changelog et fichier source
- Oublier le changelog parce que l'utilisateur ne l'a pas mentionné
- Mélanger plusieurs changements non liés dans une seule puce
- Créer un changelog séparé ailleurs que `docs/CHANGELOG.md`
- Ajouter une nouvelle section version en bas du bloc composant (toujours en tête du bloc)

## Compléments

- **Mobile** : skill `mobile-version-bump` pour l'incrément obligatoire des 3 fichiers mobile.
- Toute tâche mobile doit appliquer **les deux** skills : `mobile-version-bump` puis `keep-changelog`.
