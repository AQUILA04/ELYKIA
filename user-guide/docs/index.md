# Guide utilisateur ELYKIA

Ce site décrit les parcours actuellement disponibles dans l’application ELYKIA. Il s’adresse aux équipes de gestion, de magasin, de terrain et de recouvrement. Les menus et les actions visibles dépendent du compte connecté, de ses permissions et, dans certains cas, des paramètres activés par l’organisation.

> **Principe de lecture.** Utilisez le guide correspondant à votre rôle. Une action qui n’apparaît pas dans votre interface ne constitue pas une anomalie : elle peut être protégée par une permission ou réservée à un autre profil.

<!-- CAPTURE À INSÉRER : Barre latérale de l’application web avec les sections Caisse, Stock Commercial, Ventes, Tontines, Configuration et Rapport Journalier. -->

## Les parcours disponibles

| Profil | Responsabilités principales | Guide |
|---|---|---|
| Gestionnaire, secrétaire ou administrateur | Pilotage, clients, trésorerie, contrôles, validation et configuration. | [Guide Gestionnaire](manager/index.md) |
| Magasinier | Catalogue, inventaire, réceptions, livraisons et retours de stock. | [Guide Magasinier](storekeeper/index.md) |
| Commercial | Portefeuille clients, demandes de stock, ventes, encaissements et tontine. | [Guide Commercial](commercial/index.md) |
| Chef de recouvrement | Retards, contrôles de carnet, clôtures terrain, plan de tournée et synchronisation mobile. | [Guide Chef de recouvrement](recovery-manager/index.md) |

## Repères essentiels

### Le cycle de travail

Les opérations monétaires sont rattachées à une **journée comptable** et à une **caisse**. Selon les droits du compte, la journée est ouverte puis fermée par les responsables, tandis que chaque agent concerné ouvre ou ferme sa propre caisse. Le menu **Caisse** donne accès à l’ouverture ou à la fermeture et à l’**Opération Journalière**.

### Les statuts font foi

Les crédits, demandes de stock, retours, livraisons tontine et réceptions ne sont pas seulement des listes : leurs actions changent selon leur statut. Avant d’agir, vérifiez systématiquement le badge de statut et la période affichée.

| Flux | Enchaînement courant |
|---|---|
| Demande de sortie stock | `CREATED` → `VALIDATED` → `DELIVERED` |
| Réception de stock | `PENDING` → `VALIDATED`, ou `REFUSED` / `CANCELLED` selon le rôle et l’étape |
| Vente à crédit | `CREATED` → `VALIDATED` → `INPROGRESS` → `SETTLED` |
| Livraison tontine | `PENDING` → `VALIDATED` → `DELIVERED` |

### Des données filtrées et protégées

Les tableaux récents conservent généralement la recherche, les filtres et la pagination pendant la navigation. Les KPI financiers, exports PDF, annulations, réaffectations et paramètres peuvent être masqués selon les permissions. Ne contournez jamais un contrôle d’accès en partageant un compte : demandez plutôt l’habilitation adaptée à votre responsable.

## Signaler un besoin d’assistance

Avant de signaler un problème, notez le nom de l’écran, la période sélectionnée, le statut de l’opération et, si elle existe, sa référence. Ces éléments permettent à l’équipe support de retrouver rapidement le dossier sans exposer de données sensibles.
