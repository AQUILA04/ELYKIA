# Opérations quotidiennes

Cette page rassemble les gestes de contrôle du jour : journée comptable, caisse, clients, comptes et versements. Les libellés et boutons dépendent des permissions de la session.

## Journée comptable et caisse

La page **Gestion de la journée comptable** affiche la date comptable, en lecture seule, et l’action **Ouvrir** ou **Fermer** selon son état. Lorsqu’elle est ouverte, la liste **Caisses Ouvertes** identifie les collecteurs encore en service. Cette page peut être réservée aux comptes chargés de l’ouverture ou de la fermeture.

Le menu **Caisse > Ouverture / Fermeture** permet à l’agent autorisé d’ouvrir ou de fermer sa caisse. L’écran indique le nom de l’utilisateur concerné et ne demande pas de saisie supplémentaire.

<!-- CAPTURE À INSÉRER : Écran Gestion de la caisse avec le nom de l’utilisateur et le bouton Ouvrir Caisse. -->

| Action | Précondition | Résultat attendu |
|---|---|---|
| Ouvrir la journée | Permission d’ouverture et date comptable proposée. | Les opérations du jour peuvent être réalisées. |
| Ouvrir une caisse | Journée comptable ouverte et permission de caisse. | L’agent peut enregistrer ses opérations. |
| Fermer une caisse | Fin des opérations de l’agent. | La caisse ne doit plus recevoir de nouvelle opération. |
| Fermer la journée | Contrôle préalable des caisses encore ouvertes. | La journée est clôturée selon la procédure de l’organisation. |

Le **billetage** peut être accessible selon le déploiement. Il consiste à renseigner les quantités de billets et de pièces ; le total est calculé avant la validation. Comparez le total obtenu avec les opérations enregistrées, sans modifier artificiellement les montants pour faire disparaître un écart.

## Clients et comptes

Dans **Clients**, recherchez d’abord par nom, prénom, téléphone ou localité. Un filtre commercial peut être appliqué, et les KPI indiquent notamment les clients avec crédit actif ou membres tontine. La création exige les informations d’identité, la pièce, les coordonnées, la localité et les commerciaux associés. La géolocalisation peut être obtenue par GPS ou saisie manuellement.

La réaffectation d’un portefeuille par cases à cocher est réservée aux comptes habilités. Le responsable peut choisir séparément un commercial crédit et un commercial tontine ; la case de transfert automatique ne concerne que les ventes crédit en cours et n’est disponible qu’après sélection d’un commercial crédit.

## Suivre l’opération journalière et les versements

Le sous-menu **Caisse > Opération Journalière** affiche des crédits avec le client, la localité, la mise journalière et le reste à payer. Il fournit un accès aux détails et, selon l’habilitation, à des documents de suivi.

Les versements ne se lisent plus comme un total unique. Dans le **Rapport Journalier**, le segment **Versements** sépare les montants crédit, tontine, solde de nouveaux comptes, surplus et total. Les règles de création, d’annulation et de réception sont précisées dans le guide [Rapports et configuration](reporting_config.md).
