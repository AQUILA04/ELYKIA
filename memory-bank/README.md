# Memory Bank ELYKIA

Mémoire persistante du dépôt, lue par les agents Cursor avant d’explorer le code. Elle résume le produit, l’architecture et le travail en cours. Elle ne remplace pas les docs détaillées : elle y renvoie.

Les fichiers sont en français, factuels, et tenus courts. Une information non vérifiée dans le dépôt est marquée **« à compléter »**.

## Fichiers

| Fichier | Rôle |
|---------|------|
| [`projectbrief.md`](projectbrief.md) | Produit, objectifs, utilisateurs |
| [`productContext.md`](productContext.md) | Métier, parcours, vocabulaire |
| [`systemPatterns.md`](systemPatterns.md) | Architecture, frontières, conventions |
| [`techContext.md`](techContext.md) | Stack, commandes, CI/CD, versions |
| [`activeContext.md`](activeContext.md) | Focus courant et changements récents |
| [`progress.md`](progress.md) | Ce qui fonctionne, points d’attention, suite |
| [`decisions.md`](decisions.md) | Décisions techniques notables |

## Protocole de mise à jour

1. **Début de tâche.** Lire au minimum `projectbrief.md`, `activeContext.md`, `systemPatterns.md` et `techContext.md` avant d’explorer le code. Lire les autres fichiers s’ils concernent la tâche.
2. **Changement notable** (fonctionnalité, architecture, dépendance, parcours, décision, correctif d’un problème suivi). Mettre à jour les fichiers concernés **dans la même PR** que le code. Rafraîchir `activeContext.md` et, si le constat change, `progress.md` ou `decisions.md`.
3. **Rester concis.** Une décision, un fait, un lien. Ne pas recopier `docs/`, le guide utilisateur ni le changelog.
4. **Commande « update memory bank ».** Relire les neuf fichiers, les confronter au code, au changelog et aux commits récents, puis les réécrire là où ils sont faux ou périmés.
5. **Sources de vérité.** Versions : `frontend/package.json`, `mobile/package.json`, `customer-space/package.json`, `backend/pom.xml`. Historique : `docs/CHANGELOG.md`. Parcours métier : `user-guide/docs/`. Ne pas inventer un fait pour combler un trou.

Règle agent : [`.cursor/rules/memory-bank.mdc`](../.cursor/rules/memory-bank.mdc).
