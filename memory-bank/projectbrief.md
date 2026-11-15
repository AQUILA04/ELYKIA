# Project brief

ELYKIA est la plateforme de gestion d’**Aménouvévé-Yaveh** (raison enregistrée aussi `AMENOUVEVE-YAVEH` dans la licence backend). L’entreprise vend des produits alimentaires à crédit à Lomé (Togo), avec livraison sur les marchés. Site vitrine : `website/` (« Finance alimentaire à Lomé »). Dépôt GitHub : `aquila04/elykia`. Éditeur technique cité dans le README : Optimize. Licence : projet propriétaire, usage interne.

## Ce que le logiciel couvre

Cycle commercial et financier de la vente à crédit, plus les tontines et le stock :

- Référentiels : clients, localités, comptes, articles, utilisateurs et profils.
- Stock commercial et stock tontine : demandes de sortie, validation, livraison magasin, retours, inventaire.
- Ventes : crédits étalés, ventes au comptant, recouvrements (mises), rattrapage.
- Tontines : adhésions, collectes, sessions, livraisons, contrôles de carnet.
- Caisse : versements, billetage, rapport journalier, journée comptable.
- Terrain : application mobile (commerciaux et chefs de recouvrement), y compris hors ligne.
- Espace client : consultation des achats, commandes, tontine, paiements Mobile Money.
- Elykia IA : chat d’aide (guide) et questions chiffrées (Text-to-SQL), droit `ROLE_AI_CHAT`.

Le détail fonctionnel est dans [`README.md`](../README.md) et le guide [`user-guide/docs/index.md`](../user-guide/docs/index.md).

## Objectifs observés dans le produit

- Tenir le portefeuille client, le stock et la caisse d’une agence de vente à crédit alimentaire.
- Laisser les agents saisir sur le terrain sans réseau, puis synchroniser.
- Donner au client un canal (espace client) pour suivre achats, tontine et payer via Mobile Money (Mixx by Yas, Flooz).
- Superviser (gestionnaire, secrétariat, administration) : validations, annulations encadrées, rapports, BI.

Objectifs chiffrés (volume, SLA, nombre d’agences) : **à compléter**.

## Utilisateurs

Profils déclarés dans `backend/src/main/resources/application.yml` (`security.config.profiles`) :

| Code | Rôle métier (guide) |
|------|---------------------|
| `GESTIONNAIRE` | Pilotage, validations, caisse, configuration |
| `SECRETARY` | Secrétariat, proche du gestionnaire sur plusieurs droits |
| `PROMOTER` | Commercial / promoteur terrain |
| `STOREKEEPER` | Magasinier |
| `RECOVERY_MANAGER` | Chef de recouvrement |
| `ADMIN`, `SUPER_ADMIN` | Administration, annulations étendues, audit |
| `CLIENT` | Espace client |
| `USER` | Profil minimal (`ROLE_USER`) |

Les menus dépendent des permissions `ROLE_*` (ngx-permissions côté web). Ne pas documenter dans le guide utilisateur les écrans masqués à un profil. La matrice complète est `security.config.profil-permissions` dans `application.yml`, pas ici.

## Hors périmètre de ce brief

Nombre d’agences en production, organigramme, et feuille de route produit : **à compléter**.
