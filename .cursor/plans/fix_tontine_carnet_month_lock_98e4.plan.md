# Fix mois grisés — contrôle carnet tontine RM

## Diagnostic

### Bug 1 — Mois « Système : 0 » grisés (ex. mars–mai sous COM003)

Cause : `monthCollectedElsewhere` grise correctement un mois vide lorsqu’un **autre** bloc a déjà des cotisations pour ce mois. Mais le pack expose le calendrier complet sous **chaque** commercial, donc le mois apparaît quand même sous COM003 avec « Système : 0 » + opacity locked — aspect de mois vide bloqué à tort.

Correctif : `omitClaimedEmptyMonthRows` retire ces stubs. Le mois reste contrôlable sous le commercial qui l’a encaissé. Les mois vraiment vides (fév, août…) restent cochables.

### Bug 2 — Pas de sélecteur commercial/mise sur mars (Pierre / COM015)

Cause : comportement attendu. « Mise : 200 FCFA » en lecture seule = `!canEditAttribution` = mois déjà cotisé (`systemAmount > 0`). Pas de réattribution. Avril « vide sous le header » = mois non coché. Chaque mois vide éligible continue d’afficher commercial + mise de façon indépendante.

## Fichiers

- `mobile/.../rm-tontine-month-attribution.ts` (+ spec)
- `rm-tontine-field-control-sheet.component.ts`
- Guide RM mobile + index RAG + `frontend/src/user-guide/`
- Mobile **2.39.4**
