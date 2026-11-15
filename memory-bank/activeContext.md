# Contexte actif

Arrêt au **2026-11-15**, `main` = `d37c9bbd` (merge PR #228). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.50.1** — Backend **1.53.0** — Mobile **2.39.1** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

## Focus récent (changelog et PR mergées)

1. **Commerciaux** (PR #228, 2026-11-15). Menu distinct des utilisateurs. Annuaire du personnel (nom obligatoire, pièce et photo facultatives) et historique d’affectation des comptes, périodes sans chevauchement. Permission `ROLE_MANAGE_COMMERCIAL_STAFF`.
2. **Commandes et livraisons tontine** (PR #227). Acceptation groupée des commandes en attente du filtre. Validation groupée des livraisons. Une demande de stock tontine par commercial.
3. **Vente au comptant puis remise magasin** (2026-11-14). Encaissement immédiat, stock réservé, clôture à la livraison.
4. **Solde prévisionnel tontine** (2026-11-14). Plafond de commande et garde-fou à la remise, y compris session clôturée.
5. **Carnet tontine** (2026-11-14). Mois encore à zéro : le chef de recouvrement désigne le commercial et la mise lus sur le carnet. Le contrôle reste possible après clôture de session.
6. **Annulation d’une demande de sortie validée** non livrée (`ROLE_CANCEL_VALIDATED_STOCK_REQUEST`).
7. **Packs** (2026-11-13). Colis impair, gros, demi-gros, offres libres, prix de ligne.
8. **Visibilité du prix unitaire** (2026-11-09) sur les trois clients, paramètre d’agence.
9. **Espace client** (jusqu’au 2026-11-09). Prix unitaires, adhésions conditionnelles, paiement Mobile Money, OTP, suppression de compte.

Mobile 2.39.x aligne livraison tontine (solde prévisionnel) et contrôle de carnet. Pas de bump mobile le 2026-11-15 : le menu Commerciaux est web + API.

## Travail en cours dans l’arbre

Aucun chantier produit ouvert identifié sur `main` au moment de cette note. Feuille de route au-delà du changelog : **à compléter**.

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
