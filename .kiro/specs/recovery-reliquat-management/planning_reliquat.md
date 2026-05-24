# Spécification Fonctionnelle — Gestion des Reliquats de Recouvrement

**Document destiné aux parties prenantes non techniques**
**Projet** : Application mobile ELYKIA — Module Recouvrement
**Date** : Mai 2026
**Statut** : En attente de validation

---

## 1. Contexte et problème à résoudre

### La situation actuelle

Lorsqu'un commercial collecte un remboursement auprès d'un client, il doit enregistrer un montant correspondant exactement à une ou plusieurs **mises** (le montant unitaire de remboursement défini dans le contrat de crédit).

**Le problème** : certains clients remettent un montant qui ne correspond pas exactement à un nombre entier de mises. Il n'y a pas toujours de monnaie disponible sur le terrain.

**Exemple concret** :
> La mise mensuelle d'un client est de **350 FCFA**. Le client remet **500 FCFA** au commercial. Le commercial ne peut pas rendre la monnaie. Il ne peut pas non plus enregistrer 2 mises (car 500 < 700). Il enregistre donc 1 mise de 350 FCFA et garde les 500 FCFA, mais les **150 FCFA de différence ne sont nulle part tracés**. La comptabilité du commercial est donc fausse : il a reçu 500 FCFA mais n'en déclare que 350.

Ce problème se répète quotidiennement et crée des écarts comptables difficiles à justifier en fin de journée.

---

### La solution proposée : le Reliquat

Un **reliquat** est l'excédent de paiement conservé par le commercial pour le compte d'un client. Il est :
- **tracé** dans l'application mobile dès sa création
- **cumulé** au fil des recouvrements
- **réutilisé automatiquement** dès qu'il permet de couvrir une mise supplémentaire
- **inclus dans la comptabilité journalière** du commercial
- **transmis au serveur central** lors de la synchronisation quotidienne

---

## 2. Comment ça fonctionne — Les 3 scénarios

### Scénario A — Le client donne plus que la mise (génération de reliquat)

> Mise = 350 FCFA | Client donne 500 FCFA | Pas de reliquat existant

1. Le commercial saisit **500 FCFA** comme montant reçu
2. L'application calcule automatiquement : **1 mise couverte** (350 FCFA) + **reliquat de 150 FCFA**
3. Une case à cocher **"Conserver le reliquat"** apparaît, **cochée par défaut**
4. Le commercial confirme → 1 mise est enregistrée, 150 FCFA sont conservés pour le client
5. Le commercial doit déclarer **500 FCFA** en fin de journée (350 de mise + 150 de reliquat)

---

### Scénario B — Le reliquat complète un paiement insuffisant

> Mise = 300 FCFA | Client donne 200 FCFA | Reliquat existant = 100 FCFA

1. L'application affiche automatiquement : **"Reliquat existant : 100 FCFA"**
2. Une case à cocher **"Utiliser le reliquat"** apparaît, **cochée par défaut**
3. Le commercial saisit **200 FCFA** comme montant reçu
4. L'application calcule : 200 + 100 (reliquat) = **300 FCFA = 1 mise couverte**
5. Le commercial confirme → 1 mise est enregistrée, le reliquat de 100 FCFA est consommé
6. Le client n'a plus de reliquat. Le commercial déclare **200 FCFA** en espèces pour ce recouvrement

---

### Scénario C — Le reliquat + nouveau paiement couvrent plusieurs mises

> Mise = 300 FCFA | Client donne 500 FCFA | Reliquat existant = 100 FCFA

1. L'application affiche : **"Reliquat existant : 100 FCFA"**
2. Le commercial saisit **500 FCFA**
3. L'application calcule : 500 + 100 (reliquat) = **600 FCFA = 2 mises couvertes**
4. Le commercial confirme → **2 mises** sont enregistrées, le reliquat est consommé
5. Le commercial déclare **500 FCFA** en espèces pour ce recouvrement

---

## 3. Règle comptable — Pas de double comptage

Un reliquat créé un jour J est inclus dans le montant à déposer ce jour-là. S'il n'est pas encore utilisé le lendemain (J+1), il **ne sera pas recompté** dans le dépôt de J+1.

**Exemple** :
- Lundi : reliquat de 150 FCFA créé → le commercial dépose 150 FCFA supplémentaires ce soir
- Mardi : ce reliquat existe toujours mais n'est **pas recompté** dans le dépôt de mardi
- Mardi : un nouveau reliquat de 150 FCFA est créé → le commercial dépose 150 FCFA supplémentaires ce soir
- Le client a donc un reliquat total de 300 FCFA, mais le commercial n'a versé que 150 FCFA chaque jour

---

## 4. Ce que verra le commercial dans l'application

| Élément | Où | Description |
|---|---|---|
| Reliquat existant du client | Écran de recouvrement | Affiché dès la sélection du client |
| Case "Utiliser le reliquat" | Écran de recouvrement | Visible si le client a un reliquat > 0, cochée par défaut |
| Plan de recouvrement calculé | Écran de recouvrement | Mises couvertes, reliquat utilisé, montant à verser |
| Case "Conserver le reliquat" | Écran de confirmation | Visible si un excédent est généré, cochée par défaut |
| Résumé après confirmation | Toast de confirmation | "2 mises enregistrées — Reliquat 150 FCFA conservé" |
| Reliquat dans la fiche crédit | Page détail crédit | Montant du reliquat actuel du client |

---

## 5. Plan de travail et estimation de charge

> Les estimations sont exprimées en **jours-développeur** (1 jour = 1 développeur travaillant une journée complète).
> Les tâches marquées *(optionnel)* peuvent être reportées à une version ultérieure sans bloquer la mise en production.

---

### Phase 1 — Fondations techniques mobiles
*Objectif : préparer la base de données et les briques logicielles de base*

| # | Travail réalisé | Estimation |
|---|---|---|
| 1 | Mise à jour de la base de données locale (SQLite v22) : création de la table de reliquats et ajout de colonnes dans la table des recouvrements | 0,5 j |
| 2 | Création des modèles de données TypeScript (interfaces `ClientReliquat`, `RecoveryPlan`, extension de `Recovery`) | 0,5 j |
| 3 | Création du service d'accès aux données reliquat (`ReliquatRepository`) : lecture, écriture, recherche par client ou commercial | 1 j |
| 4 | Création du service métier reliquat (`ReliquatService`) : calcul du plan de recouvrement, accumulation, consommation, comptabilité | 1,5 j |

**Sous-total Phase 1 : 3,5 jours**

---

### Phase 2 — Interface utilisateur mobile
*Objectif : afficher le reliquat et permettre au commercial de l'utiliser*

| # | Travail réalisé | Estimation |
|---|---|---|
| 5 | Création du composant d'affichage reliquat (`ReliquatDisplayComponent`) : reliquat existant, plan calculé, checkboxes "Utiliser" et "Conserver" | 1 j |
| 6 | Intégration dans l'écran de recouvrement (`RecoveryPage`) : chargement du reliquat, recalcul en temps réel, gestion des checkboxes, toast de confirmation | 1,5 j |
| 7 | Mise à jour du service de recouvrement (`RecoveryService`) : sauvegarde des montants reliquat, atomicité transactionnelle | 1 j |
| 8 | Affichage du reliquat dans la fiche détail crédit (`CreditDetailsPage`) | 0,5 j |

**Sous-total Phase 2 : 4 jours**

---

### Phase 3 — Comptabilité journalière
*Objectif : intégrer le reliquat dans le montant à déposer en fin de journée, sans double comptage*

| # | Travail réalisé | Estimation |
|---|---|---|
| 9 | Mise à jour du service de rapport journalier (`RapportJournalierService`) : calcul du reliquat net du jour, règle anti-double comptage, mise à jour de la date de comptabilisation | 1,5 j |

**Sous-total Phase 3 : 1,5 jours**

---

### Phase 4 — Synchronisation avec le serveur
*Objectif : transmettre les reliquats au serveur central lors de la synchronisation quotidienne*

| # | Travail réalisé | Estimation |
|---|---|---|
| 10 | Mise à jour du service de synchronisation mobile (`SynchronizationService`) : envoi des recouvrements enrichis, envoi des reliquats non synchronisés, récupération des reliquats au démarrage de l'application | 1,5 j |

**Sous-total Phase 4 : 1,5 jours**

---

### Phase 5 — Modifications côté serveur (backend)
*Objectif : recevoir, valider et persister les reliquats dans la base de données centrale*

| # | Travail réalisé | Estimation |
|---|---|---|
| 11 | Mise à jour de la base de données serveur (migration Flyway V36) : nouvelle table `client_reliquat`, nouvelles colonnes dans `credit_timeline` et `daily_commercial_report` | 0,5 j |
| 12 | Création de l'entité et du repository JPA `ClientReliquat` | 0,5 j |
| 13 | Création du service backend `ClientReliquatService` : logique upsert, validation des montants | 1 j |
| 14 | Enrichissement du DTO de synchronisation (`SpecialDailyStakeUnitDto`) et mise à jour du service `CreditTimelineService` pour persister les champs reliquat | 0,5 j |
| 15 | Création des nouveaux DTOs de synchronisation reliquat (`ReliquatSyncDto`, `ReliquatSyncUnitDto`) | 0,5 j |
| 16 | Mise à jour de l'entité `DailyCommercialReport` avec le champ `totalReliquatAmount` | 0,5 j |
| 17 | Création des nouveaux endpoints API dans `MobileController` : `POST /api/v1/mobiles/reliquats` (envoi) et `GET /api/v1/mobiles/reliquats/{commercialId}` (récupération) | 1 j |

**Sous-total Phase 5 : 4,5 jours**

---

### Phase 6 — Mise à jour du guide utilisateur
*Objectif : documenter la nouvelle fonctionnalité pour les commerciaux terrain*

Le guide utilisateur existant (`user-guide/docs/commercial/`) couvre actuellement le recouvrement de manière succincte (section 4 de `mobile_app.md`). Cette évolution introduit de nouveaux éléments visuels et une nouvelle logique que les commerciaux doivent comprendre pour travailler correctement.

| # | Travail réalisé | Fichier(s) concerné(s) | Estimation |
|---|---|---|---|
| 18 | Mise à jour de la section "Encaisser de l'Argent" dans le guide mobile : ajout de l'affichage du reliquat existant, explication des deux checkboxes, description du plan calculé en temps réel, explication du toast de confirmation | `mobile_app.md` — Section 4 | 0,5 j |
| 19 | Mise à jour de la section "Fin de Journée : Le Rapport" : expliquer que le reliquat du jour est inclus dans le "Total à Verser" et comment le lire | `mobile_app.md` — Section 6 | 0,25 j |
| 20 | Ajout d'une nouvelle section dédiée "Comprendre les Reliquats" dans le guide mobile : définition, les 3 scénarios illustrés (génération, utilisation, combinaison), règle anti-double comptage en langage simple | `mobile_app.md` — Nouvelle section | 1 j |
| 21 | Mise à jour de la fiche crédit dans le guide : documenter l'affichage du reliquat dans la vue détail crédit | `clients_accounts.md` | 0,25 j |
| 22 | Mise à jour du rapport journalier : documenter la ligne "Reliquats du jour" dans le rapport | `reporting.md` | 0,25 j |

**Sous-total Phase 6 : 2,25 jours**

---

### Phase 7 — Tests et validation *(optionnel — recommandé avant mise en production)*
*Objectif : garantir la fiabilité des calculs et la robustesse de la synchronisation*

| # | Travail réalisé | Estimation |
|---|---|---|
| 23 | Tests automatisés du calcul du plan de recouvrement (6 propriétés mathématiques vérifiées sur des milliers de combinaisons) | 1 j |
| 24 | Tests unitaires : non-négativité du reliquat, cas limites de l'algorithme | 0,5 j |
| 25 | Tests de la règle anti-double comptage (3 scénarios : reliquat d'hier déjà versé, reliquat d'hier non versé, reliquat du jour) | 0,5 j |
| 26 | Tests backend : service `ClientReliquatService`, endpoints `MobileController` | 1 j |
| 27 | Tests d'intégration : flux complet mobile (saisie → calcul → confirmation → base de données) et synchronisation backend | 1 j |

**Sous-total Phase 7 : 4 jours**

---

## 6. Récapitulatif de la charge

| Phase | Description | Charge estimée |
|---|---|---|
| Phase 1 | Fondations techniques mobiles | 3,5 j |
| Phase 2 | Interface utilisateur mobile | 4 j |
| Phase 3 | Comptabilité journalière | 1,5 j |
| Phase 4 | Synchronisation avec le serveur | 1,5 j |
| Phase 5 | Modifications côté serveur | 4,5 j |
| Phase 6 | Mise à jour du guide utilisateur | 2,25 j |
| Phase 7 | Tests et validation *(optionnel)* | 4 j |
| **TOTAL sans tests** | | **17,25 jours** |
| **TOTAL avec tests** | | **21,25 jours** |

> **Hypothèse** : 1 développeur full-stack travaillant seul.
> Avec 2 développeurs en parallèle (1 mobile + 1 backend), les phases 1–4 et 5 peuvent être menées simultanément, ramenant la durée calendaire à environ **11–12 jours ouvrés**.
> La mise à jour du guide utilisateur (Phase 6) peut être réalisée en parallèle de la Phase 7 par un rédacteur technique ou un développeur junior.

---

## 7. Risques et points d'attention

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Régression sur le calcul du rapport journalier | Moyenne | Élevé | Tests unitaires dédiés à l'anti-double comptage (Phase 6) |
| Incohérence entre reliquat mobile et serveur après une sync partielle | Faible | Moyen | Mécanisme de retry automatique + flag `isSync` |
| Mauvaise compréhension des checkboxes par les commerciaux | Moyenne | Moyen | Formation terrain + libellés clairs dans l'application |
| Migration SQLite v22 sur appareils déjà déployés | Faible | Élevé | Migration automatique au démarrage, testée sur données existantes |

---

## 8. Critères de succès

La fonctionnalité est considérée comme livrée et opérationnelle lorsque :

- ✅ Un commercial peut saisir un montant reçu supérieur à la mise et voir le reliquat calculé automatiquement
- ✅ Le reliquat d'un client est visible dans son écran de recouvrement et dans sa fiche crédit
- ✅ Un reliquat existant est automatiquement combiné avec un nouveau paiement pour couvrir des mises supplémentaires
- ✅ Le montant à déposer en fin de journée inclut les reliquats du jour sans double comptage
- ✅ Les reliquats sont transmis au serveur central lors de la synchronisation quotidienne
- ✅ Les données sont cohérentes entre l'application mobile et le serveur après synchronisation

---

## 9. Hors périmètre (non inclus dans cette version)

- Remboursement d'un reliquat en espèces au client (annulation manuelle d'un reliquat)
- Historique détaillé des mouvements de reliquat par client (traçabilité complète)
- Tableau de bord superviseur affichant les reliquats de tous les commerciaux
- Alertes automatiques si un reliquat dépasse un certain seuil ou une certaine durée

Ces fonctionnalités pourront faire l'objet d'une version ultérieure si le besoin est confirmé.
