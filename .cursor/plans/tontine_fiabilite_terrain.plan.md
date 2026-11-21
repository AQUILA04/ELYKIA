# Commande et livraison tontine — fiabilité terrain

Rédigé le 2026-11-21 après les essais sur l'environnement de test (captures 5 à 8). L'utilisateur a demandé d'enchaîner sur l'implémentation sans attendre la validation du plan.

## Audit : causes

| # | Constat | Cause |
|---|---------|-------|
| 1 | Articles ajoutés « tout seuls » à l'ouverture d'une commande | `saveTontineDeliveries` (import serveur) et `TontineDeliveryRepository.saveAll` font `INSERT OR REPLACE` des articles **par identifiant d'article**, sans effacer les articles déjà présents pour la commande. Après une modification (le serveur recrée les lignes avec de nouveaux ID), une fusion de seconde commande (`tdi-…`) ou une création locale (UUID), l'import suivant ajoute les lignes serveur à côté des anciennes : la commande affiche d'anciennes lignes et un total faux. |
| 2 | Plafond non contrôlé à l'enregistrement d'une modification | La modification (`saveRevisedOrder`) et le récapitulatif n'ont aucun contrôle local : le serveur refuse (400) avec un message brut (`%.2f`). La création contrôle déjà `max(prévisionnel, solde net)` côté mobile et serveur. Le plafond n'est affiché ni en modification ni à la livraison. |
| 3 | Spinner « Enregistrement… » bloqué sur l'aperçu du reçu | `saveRevisedOrder` ouvre l'aperçu du reçu **avant** de fermer son chargement (`finally`) : le chargement reste au-dessus de l'aperçu jusqu'à sa fermeture. Le reçu de commande tontine n'enregistre pas de PDF (les autres reçus le font) ; le bon de remise ne signale pas l'échec d'impression. |
| 4 | Pas d'ajout d'article en modification ni au récapitulatif | Fonction absente : les deux écrans n'ont qu'un stepper sur les lignes existantes. |
| 5 | Plafond invisible hors création | Non affiché sur la fiche membre ni au récapitulatif. |
| 6 | Toast « Http failure response … 400 OK » | `catch` qui affiche `error.message` d'un `HttpErrorResponse` (texte Angular) au lieu de `error.error.message` (`Response` du backend, `CommonAdviceController`). |
| — | « Livrée le » sur une commande non livrée | Le serveur remplit `deliveryDate` avec la date de demande tant que la commande n'est pas remise (colonne NOT NULL) ; mobile et web l'affichent. |
| — | Montants « 12,800 » | `DecimalPipe`/`number` sans locale `fr` dans l'aperçu du reçu et le récapitulatif. |
| — | Titre « Récapitula… » sur fond blanc | En-tête du récapitulatif hors design system (toolbar blanche, titre tronqué). |
| — | Prix sur deux lignes | Colonne montant sans `white-space: nowrap` dans la liste d'articles de la fiche. |

## Cas limites à couvrir

- Modification hors ligne : impossible (serveur requis) ; message clair, rien n'est modifié localement.
- Erreur réseau pendant l'envoi de la modification : la commande locale reste l'ancienne ; message « réseau », pas de reçu.
- Seconde tablette a fusionné une commande : l'import remplace les lignes par celles du serveur.
- Commande créée hors ligne non synchronisée : pas modifiable (« Synchronisez d'abord »).
- Plafond : `max(solde prévisionnel, solde net cotisé)` partout ; à la livraison le solde réel doit couvrir (complément possible), le plafond borne l'ajout d'articles.
- Ajout en livraison : stock tontine du commercial uniquement, quantité ≤ stock disponible.
- Impression sans imprimante : PDF enregistré, message de succès avec le chemin, fenêtre fermée ; jamais de chargement infini (délai maximal).

## Plan (PR)

1. **PR A — bloquants (points 1, 2, 3, 6 + anomalies d'affichage)**
   - Backend : message de plafond en français (plafond, montant, dépassement, `12 800 FCFA`) à la création, à la fusion et à la modification ; `deliveryDate` du DTO vide tant que la commande n'est pas livrée ; tests unitaires + intégration Postgres.
   - Mobile : remplacement des articles à l'import ; service `TontineOrderCeilingService` (plafond) utilisé en création, modification, récapitulatif ; fenêtres communes `ElykFeedbackService` (erreur / succès) + `toUserErrorMessage` (message du backend, jamais le texte Angular) ; chargement fermé avant le reçu ; reçu commande : PDF automatique, repli PDF si l'impression échoue, délai maximal ; montants en français ; en-tête du récapitulatif ; prix sur une ligne ; « Livrée le » seulement si livrée.
   - Web : « Livrée le » seulement si livrée ; message backend dans les erreurs de commande.
2. **PR B — ajout d'articles et plafond visible (points 4, 5)**
   - Mobile : modale `TontineArticlePickerModalComponent` (recherche ; commande : stock ou catalogue ; livraison : stock tontine avec contrôle) en modification et au récapitulatif ; plafond affiché partout.
   - Web : plafond dans l'aperçu de livraison et la modification.
3. Chaque PR : changelog, versions (3 fichiers mobile), memory-bank, guide + index RAG + HTML, tests unitaires, Playwright mobile adapté, vérification à l'écran (`npm run build:e2e`, port 8100).
