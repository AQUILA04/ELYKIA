---
name: mobile-version-bump
description: >
  Incrémente la version de l'app mobile ELYKIA (package.json, environment.ts,
  environment.prod.ts) après chaque modification dans mobile/. À appliquer
  systématiquement en fin de tâche mobile (correctif, feature, refactor, config,
  tests) avant de répondre à l'utilisateur. Patch par défaut (2.9.x) ; mineur
  (2.10.0) pour des fonctionnalités larges.
---

# Mobile — incrément de version

## Règle obligatoire

**Après toute modification livrée** sous `mobile/`, incrémenter la version dans **les trois fichiers** suivants, avec **la même valeur** partout :

| Fichier | Champ |
|---------|-------|
| `mobile/package.json` | `"version"` |
| `mobile/src/environments/environment.ts` | `version` dans `environment` |
| `mobile/src/environments/environment.prod.ts` | `version` dans `environment` |

Exceptions (pas d'incrément requis) :

- Question purement informative ou revue en lecture seule
- Tâche annulée sans changement livré
- La version a déjà été incrémentée dans la même tâche / le même PR
- Modification **uniquement** de `docs/CHANGELOG.md` ou de fichiers hors `mobile/`

## Quel segment incrémenter ?

Format **SemVer** `MAJEUR.MINEUR.PATCH` (ex. `2.9.1`).

| Type de changement | Incrément | Exemple |
|--------------------|-----------|---------|
| Correctif, refactor, tests, config, petit ajout UI | **PATCH** | `2.9.1` → `2.9.2` |
| Nouvelle fonctionnalité large, écran majeur, refonte de flux métier | **MINEUR** (PATCH → `0`) | `2.9.5` → `2.10.0` |
| Rupture incompatible (rare, explicite) | **MAJEUR** (mineur et patch → `0`) | `2.10.3` → `3.0.0` |

**Par défaut : PATCH.** Passer en mineur seulement si le changement est clairement une fonctionnalité substantielle visible par l'utilisateur ou le commercial.

## Workflow en fin de tâche mobile

```
- [ ] Des fichiers sous mobile/ ont été modifiés ?
- [ ] Lire la version actuelle dans mobile/package.json
- [ ] Choisir PATCH (défaut) ou MINEUR (feature large)
- [ ] Mettre à jour mobile/package.json → "version"
- [ ] Mettre à jour mobile/src/environments/environment.ts → version
- [ ] Mettre à jour mobile/src/environments/environment.prod.ts → version
- [ ] Vérifier que les trois valeurs sont identiques
```

## Exemples

**Correctif stock commercial (patch) :**
- `2.9.1` → `2.9.2` dans les 3 fichiers

**Nouvel écran tontine complet (mineur) :**
- `2.9.2` → `2.10.0` dans les 3 fichiers

## Anti-patterns

- Modifier le code mobile sans toucher aux 3 fichiers de version
- Versions désynchronisées entre `package.json` et les `environment*.ts`
- Incrémenter le mineur pour un simple correctif ou un renommage interne
- Oublier l'incrément parce que l'utilisateur ne l'a pas demandé

## Complément

Appliquer aussi le skill **keep-changelog** : documenter le changement sous `## Mobile — [X.Y.Z] — YYYY-MM-DD` dans `docs/CHANGELOG.md` (version alignée sur les 3 fichiers ci-dessus, pas sous `[Unreleased]`).
