# Contexte produit

Activité : vente à crédit de produits alimentaires sur les marchés de Lomé, avec une tontine (épargne collective convertie en marchandises) et un recouvrement terrain. Devise affichée : **FCFA**.

Le guide métier canonique est `user-guide/docs/` (MkDocs, un parcours par profil). Ne pas le dupliquer ici.

## Parcours structurants

Statuts repris du guide (`user-guide/docs/index.md`) :

| Flux | Enchaînement |
|------|----------------|
| Demande de sortie de stock | Créée → Validée → Livrée |
| Réception fournisseur | En attente → Validée (ou Refusée / Annulée) |
| Vente à crédit | Créée → Validée → En cours → Soldée |
| Livraison tontine | En attente → Validée → Livrée |

Autres enchaînements livrés récemment (voir `docs/CHANGELOG.md`, ne pas les figer comme uniques) :

- **Vente au comptant** (backend 1.50.0, 2026-11-14) : l’encaissement est immédiat, la vente reste validée, une demande de sortie validée réserve le stock. Le magasinier livre et clôture. Annuler avant remise extourne l’encaissement.
- **Livraison tontine** (backend 1.51.0) : le panier est plafonné au solde prévisionnel ; la remise exige que le solde disponible couvre le panier.
- **Journée comptable et caisse** : ouverture / fermeture, opération journalière, billetage, versements. Le rapport journalier rattache les montants à la période de versement.
- **Mobile commercial** : clients, stock, ventes, commandes, tontine, synchro. Données filtrées par l’utilisateur connecté.
- **Mobile chef de recouvrement** (`rm/`, garde `RmProfilGuard`) : retards, plan de tournée, contrôles de carnet, clôtures terrain.
- **Espace client** : auth (OTP SMS), tableau de bord, achats, catalogue, panier, tontine, paiement Mobile Money, profil, demande de suppression de compte.

## Vocabulaire

| Terme | Sens dans l’UI |
|-------|----------------|
| Mise | Cotisation (crédit ou tontine), souvent journalière |
| Carnet | Suivi papier des cotisations, contrôlé sur le terrain |
| Écart de carnet | Écart entre le carnet et le système ; peut être accepté (annule le trop, enregistre le manquant) |
| Recouvrement | Encaissement des échéances de crédit |
| Rattrapage | Régularisation de mois ou de stock antérieur |
| Promoteur | Commercial terrain (`PROMOTER`) |
| Demande de sortie | Sortie de stock vers un commercial (crédit ou tontine) |
| Solde disponible | Cotisations déjà en caisse, utilisables pour une remise tontine |
| Solde prévisionnel | Plafond de commande tontine (historique + mise en cours sur les mois restants tant que la session est ouverte) |
| Part société | Quote-part de la tontine revenant à la société |
| Ancien portefeuille | Dossiers clos, consultables (mobile : Plus > Ancien portefeuille) |
| Gros / demi-gros / offre libre | Offres de vente d’un article conditionné (colis, éventuellement impair) |
| Journée comptable | Période à laquelle sont rattachées les opérations d’argent |
| Billetage | Comptage des espèces à la caisse |

## Paramètres métier qui changent l’écran

- `RESTRICT_UNIT_PRICE_VISIBILITY` : masque le prix unitaire et le montant de ligne selon le profil ; le total du document reste. Réglage relu à l’accueil, dans Paramètres, et au plus toutes les 6 heures (clients web, mobile, espace client).
- Remote config espace client `dualCreditAuthorization` : affiche ou non les adhésions multiples et le choix du type de crédit au panier.
- FIFO : valorisation de stock par lots (`ENABLED_FIFO_STOCK_VALUATION`). Une livraison peut être refusée si les lots ouverts ne couvrent pas la quantité, même si le stock affiché est plus haut. Procédure de contrôle : `docs/diagnostic-fifo-entrees-sans-lot.md`.

## Guides par profil

`user-guide/mkdocs.yml` : gestionnaire, magasinier, commercial, chef de recouvrement, administrateur, espace client.
