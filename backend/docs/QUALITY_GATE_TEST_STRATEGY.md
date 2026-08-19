# Stratégie de qualité backend — ELYKIA

## Objectif

Cette stratégie vise à faire de la suite backend un **signal de non-régression fiable**. Elle privilégie les tests unitaires pour chaque règle métier isolable, complète ceux-ci par des tests d’intégration aux frontières réellement risquées — persistance, transactions et contrats HTTP — puis vérifie les parcours transverses critiques. Une suite entièrement verte réduit fortement le risque de réintroduire une règle métier déjà sécurisée ; elle ne constitue toutefois pas une promesse absolue d’absence de défaut, notamment en dehors des scénarios spécifiés.

## Constat initial

L’audit du `19 août 2026` montre que le backend contient **133 classes de service** et que les tests existants sont hétérogènes. L’exécution de référence a lancé `266` tests, avec `6` échecs et `26` erreurs. Les erreurs de contexte Spring masquent plusieurs contrôles d’intégration, tandis que certains tests unitaires ne mettent pas en place les dépendances effectivement utilisées. Le build ne calcule encore aucune couverture et n’applique aucun seuil de qualité.

| Élément | État constaté | Conséquence pour le quality gate |
|---|---|---|
| Environnement de build | Java 17 requis ; les bibliothèques internes doivent être construites avant le backend | La procédure de build doit être rendue reproductible dans l’intégration continue. |
| Tests d’intégration Spring | Un cycle de dépendance autour de l’encodeur de mot de passe empêche le chargement du contexte | Les tests concernés ne prouvent actuellement aucun comportement applicatif. |
| Tests unitaires existants | Des mocks ou prérequis métier sont manquants dans plusieurs cas | Les tests doivent exprimer le `Given` complet avant l’action métier. |
| Couverture | Aucun rapport ni seuil JaCoCo | Une régression peut diminuer la couverture sans être bloquée. |
| Fonctionnalités à risque récentes | Reliquats client et réconciliation d’inventaire sans test dédié | Les invariants financiers et de stock doivent être verrouillés en priorité. |

## Principes de conception des tests

Chaque test suivra explicitement la structure **Given / When / Then**. Le `Given` met en place tous les objets, droits, stocks, contrats, périodes comptables et retours de dépôt nécessaires au scénario. Le `When` appelle une seule opération métier observable. Le `Then` vérifie les résultats métier, les erreurs attendues et, lorsqu’il y a un effet de bord, les écritures persistées ou les appels aux collaborateurs concernés.

Les objets de préparation communs seront centralisés dans `src/test/java/.../support/` sous forme de fabriques à valeurs sûres et surchargées par scénario. Les fabriques ne porteront aucune assertion : elles créeront uniquement des données cohérentes et lisibles. Les assertions resteront dans les tests afin que la règle protégée soit immédiatement visible lors d’un échec.

| Niveau | Usage dans ELYKIA | Règles de fiabilité |
|---|---|---|
| Unitaire Mockito/JUnit | Calculs, validations, routage métier, erreurs et transitions d’état de chaque service | Pas de contexte Spring, dépendances mockées, données minimales et assertions explicites. |
| Intégration JPA/Spring | Transactions, contraintes, mappage des dépôts, migrations et contrats de contrôleur | Profil isolé, données créées par test, nettoyage transactionnel ou explicite, aucun appel externe réel. |
| Parcours métier backend | Flux critiques traversant plusieurs domaines et écritures comptables | Nombre limité, préparé par API ou repositories de test, vérifie les invariants finaux et les effets de bord. |

## Ordre de couverture par domaines

L’ordre respecte les prérequis de l’activité : les référentiels et les acteurs sont testés avant le stock, puis avant les crédits et tontines qui dépendent de ces données.

| Vague | Domaine | Prérequis métier (`Given`) | Règles à sécuriser en priorité |
|---:|---|---|---|
| 0 | Infrastructure de test | Java 17, bibliothèques internes, profil de test, sécurité neutralisée ou correctement configurée | Démarrage fiable, isolation de base, rapport JaCoCo et séparation unitaires/intégration. |
| 1 | Référentiels et acteurs | Localité, article/type, client, commercial/collecteur, utilisateur et droits | Validation des données, unicité, affectation client–collecteur, autorisations de base. |
| 2 | Magasin et inventaire | Articles et stock initial cohérent | Stock jamais négatif, ajustement dette/surplus, écritures d’historique et traitement en lot atomiquement lisible. |
| 3 | Stock commercial et approvisionnement | Commercial, articles, stock magasin, demandes/réceptions/retours | Conservation des quantités, FIFO, valorisation, mouvements et rejets en cas de stock insuffisant. |
| 4 | Crédit et recouvrement | Client affecté, commercial, article disponible, plan de paiement et période comptable | Éligibilité, vente/crédit, échéancier, mises, paiement, rattrapage, transfert et traçabilité. |
| 5 | Reliquats et synchronisation mobile | Crédit actif, client, commercial, mise, reliquat initial éventuel | Upsert, consommation bornée, rejet des montants invalides, idempotence de synchronisation et absence de double comptage. |
| 6 | Tontine | Membre, session, article, stock et règles d’allocation | Cotisations, allocation, livraisons, stock tontine, annulations et statut des opérations. |
| 7 | Comptabilité, dépenses et rapports | Période ouverte, commercial, encaissements/décaissements, reliquats | Journée comptable, remise, dépenses, montants nets, agrégats et données des documents exportés. |
| 8 | Espaces client et recrutement | Identité, contexte client, offre ou candidature | Authentification, isolation par client, règles de publication et soumission de candidature. |

## Parcours d’intégration à couvrir

Les tests d’intégration ne répéteront pas chaque branche unitaire. Ils prouveront que les domaines interagissent correctement sur les flux qui portent un risque financier ou de stock.

| Identifiant | Parcours | Invariants finaux |
|---|---|---|
| INT-CREDIT-01 | Référentiels → commercial/client → stock → création de crédit → encaissement d’une mise → journée comptable | Le stock est décrémenté correctement, le crédit et son échéance sont cohérents, l’encaissement est tracé une seule fois et le total journalier est exact. |
| INT-RELIQUAT-01 | Crédit actif → synchronisation d’un paiement supérieur à la mise → reliquat → synchronisation suivante | Le reliquat est cumulé ou consommé selon le delta ; la synchronisation répétée est idempotente ; aucun montant ne se perd ni n’est compté deux fois. |
| INT-TONTINE-01 | Membre/session → contribution → allocation → livraison → mouvement de stock | Les cotisations allouées, le statut de livraison et le stock final sont cohérents avec la politique d’allocation. |
| INT-INVENTORY-01 | Inventaire avec écart dette/surplus → réconciliation unitaire puis en lot | Le stock final est toujours positif ou nul, les actions incompatibles sont rejetées par article et les historiques reflètent l’ajustement réellement appliqué. |
| INT-ACCOUNTING-01 | Encaissements, dépenses et reliquats du jour → clôture/rapport | Le montant à remettre correspond aux flux du jour ; les reliquats déjà comptabilisés ne sont pas ajoutés une seconde fois. |

## Quality gate cible et progression

Le quality gate sera introduit sans seuil arbitraire qui rendrait immédiatement la branche inutilisable. Après une mesure JaCoCo initiale, les seuils seront configurés avec une trajectoire documentée : aucun recul de couverture sur les packages métier couverts, puis relèvement par vagues jusqu’aux seuils cibles. Les services critiques introduits ou modifiés dans les vagues ci-dessus devront avoir une couverture de branches significative avant intégration.

| Contrôle | Règle de passage cible |
|---|---|
| Compilation | `mvn verify` sous Java 17, avec les bibliothèques internes disponibles. |
| Tests unitaires | Tous verts ; aucun accès réseau, système de fichiers non maîtrisé ou contexte Spring inutile. |
| Tests d’intégration | Tous verts sur le profil de test ; les migrations et contrats HTTP critiques sont exercés. |
| Couverture | Rapport JaCoCo publié ; seuils globaux progressifs et règle de non-régression des packages métier touchés. |
| Flakiness | Deux exécutions consécutives de la suite verte avant validation de la stabilisation. |
| Lisibilité | Chaque test est focalisé, avec `Given / When / Then`, assertions visibles et fabriques réutilisables sans assertions cachées. |

## Premiers correctifs prioritaires

La stabilisation commence par le cycle de dépendances qui empêche les tests Spring, puis par les six défaillances indépendantes observées : préparation de `CommercialStockMovementServiceTest`, injection de la dépendance de remise dans `ExpenseServiceTest`, prérequis de stock pour `TontineDeliveryServiceTest`, contrat de libellé PDF, données de projection BI et contrôleurs qui dépendent du contexte cassé. Une fois cette base verte, les tests dédiés aux reliquats et à la réconciliation d’inventaire seront ajoutés avant l’élargissement aux autres domaines.

> Les nouveaux tests doivent vérifier une **règle métier** ou un **contrat d’intégration** concret. Ils ne doivent pas se contenter de vérifier qu’un mock a été appelé si le résultat métier observable peut être vérifié.

## État d’exécution

Ce document sera mis à jour avec les classes testées, les invariants ajoutés, la couverture mesurée et les seuils effectivement appliqués à chaque vague.

## Palier 9 — JaCoCo et non-régression de couverture

Le `19 août 2026`, JaCoCo `0.8.12` a été intégré au cycle Maven. L’agent est préparé avant les tests, puis `mvn verify` génère les rapports `HTML`, `CSV` et `XML` sous `target/site/jacoco/`. Le même cycle exécute désormais le contrôle de couverture : un build ne peut plus être validé uniquement parce que les tests sont verts si la couverture tombe sous la base formellement adoptée.

| Périmètre | Métrique | Couverture de référence | Seuil appliqué | Intention |
|---|---|---:|---:|---|
| Bundle backend | Lignes | 46,75 % | 46 % | Éviter tout recul global de la couverture exécutable. |
| Bundle backend | Branches | 12,29 % | 12 % | Conserver la couverture minimale des décisions sur l’ensemble du code. |
| `com.optimize.elykia.core.service.*` | Lignes | 54,58 % | 54 % | Bloquer la baisse de couverture agrégée des règles métier. |
| `com.optimize.elykia.core.service.*` | Branches | 38,18 % | 38 % | Protéger les conditions métier sur le périmètre de services. |
| Chaque sous-package `core.service.*` | Lignes | minimum mesuré : 32,24 % | 30 % | Empêcher qu’un domaine métier individuel devienne insuffisamment exercé. |
| Chaque sous-package `core.service.*` | Branches | minimum mesuré : 19,44 % | 19 % | Garantir un plancher de décisions couvertes par domaine. |

Les packages racines techniques non spécialisés de `com.optimize.elykia.core.service` ne sont pas assimilés à un domaine métier dans la règle par package ; ils restent toutefois inclus dans les seuils global et agrégé des services. Les seuils sont volontairement ancrés sous la couverture observée, sans arrondi à la hausse fragile, et doivent être relevés au palier suivant dès que la couverture additionnelle le permet.

> La commande de référence du quality gate est : `sh ./mvnw -B -Delykia.testcontainers.host-network=true verify`. Elle produit les tests, l’artefact, le rapport JaCoCo et le contrôle de seuils dans un seul cycle reproductible.
