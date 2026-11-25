# Guide Gestionnaire

Ce guide accompagne les gestionnaires et secrétaires dans les tâches de pilotage. Les responsabilités exactes restent déterminées par les permissions attribuées au compte : la présence d’un menu ou d’un bouton confirme qu’il est autorisé pour votre session.

<!-- CAPTURE À INSÉRER : Accueil web d’un gestionnaire avec le menu développé et les indicateurs du tableau de bord. -->

## Votre espace de pilotage

Le menu peut notamment donner accès au **Dashboard**, aux **Clients**, aux **Commerciaux**, aux **Articles**, au **Stock Commercial** (sélecteur **Crédit** / **Tontine**), aux **Ventes**, aux **Tontines**, aux **Dépenses**, à la **Configuration**, au **Rapport Journalier** et aux **Inventaires**. Certains éléments, comme les rapports mensuels, le recrutement ou ELYKIA IA, ne s’affichent que si la permission et le paramétrage nécessaires sont actifs.

| Priorité | Où intervenir | Finalité |
|---|---|---|
| Démarrer et contrôler l’activité | Caisse, Clients, Ventes | Sécuriser les opérations du jour et les portefeuilles. |
| Garantir la disponibilité des articles | Articles, Inventaires, Stock Commercial, Traçabilité des Lots, Transferts Inter-Agences | Suivre par agence le stock physique (**En stock**), les engagements (**Réservé**) et le disponible (**Disponible**), éditer le **Bon de Commande Fournisseur (PDF)**, tracer la liquidation de chaque lot et piloter les transferts inter-agences. |
| Suivre et régler les dettes | Dettes, Stock mensuel, Rapport journalier, Inventaires | Constituer les dettes marchandise / caisse / inventaire et enregistrer les règlements. |
| Contrôler l’argent et la performance | Rapport Journalier, Dépenses | Lire les indicateurs, les versements et les remises. |
| Suivre l’espace client | Inscriptions clients | Valider les inscriptions de l’espace client. |
| Paramétrer l’agence | Configuration | Maintenir les référentiels et les paramètres. |

## Règles de travail

La gestion d’une opération doit toujours suivre son statut. Dès qu’une demande de sortie est **Validée**, sa quantité est réservée au magasin de l’agence (et un éventuel manquant est automatiquement alloué en FIFO à la prochaine réception) ; en cas de livraison partielle, une demande reliquat enfant est créée automatiquement au statut **Validée**. Une réception de stock en attente n’a pas encore augmenté le stock ; une vente validée n’est pas encore démarrée. Les boutons disponibles sur une ligne correspondent à l’étape atteinte et à vos droits.

Consultez les pages suivantes selon la tâche à accomplir :

- [Tableaux de bord](dashboard.md) pour lire les KPI sans confondre les périodes.
- [Opérations quotidiennes](operations.md) pour les caisses, clients, comptes et versements.
- [Commerciaux](commerciaux.md) pour savoir qui utilise chaque compte commercial, et sur quelle période.
- [Inscriptions](client_registrations.md) (**Services en ligne**) pour valider les demandes de l’espace client.
- [Stocks, ventes et commandes](stock_sales.md) pour les flux de marchandises et de crédits.
- [Finances et tontines](finance.md) pour les dépenses, remises et contrôles tontine.
- [Rapports et configuration](reporting_config.md) pour l’analyse et les référentiels.
