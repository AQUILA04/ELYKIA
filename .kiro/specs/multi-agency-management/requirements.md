# Requirements Document

## Introduction

**Gestion Multi-Site / Multi-Agence (ELYKIA)**

ELYKIA est une application de microfinance/credit developpee en Spring Boot (backend), Angular (frontend web) et Ionic/Angular (application mobile terrain). Actuellement, toutes les operations sont implicitement rattachees a une seule entite organisationnelle. Cette evolution vise a introduire la gestion de plusieurs agences (multi-site) avec :

- un cloisonnement strict des donnees operationnelles par agence pour les profils terrain ;
- une vue consolidee multi-agences pour les profils de supervision (GESTIONNAIRE, ADMIN, SUPER_ADMIN) ;
- un historique des mutations d'agence permettant de tracer les transferts d'utilisateurs dans le temps ;
- une propagation de l'identifiant d'agence dans l'authentification JWT ;
- une strategie de migration des donnees existantes.

L'entite `Agency` existe deja en base et est utilisee pour les rapports financiers. Cette feature etend son role a la gouvernance globale des donnees operationnelles.

## Glossary

- **Agency** : Entite organisationnelle correspondant a un site physique ou une succursale. Identifiee par un `id` (Long) et un `code` unique.
- **AgencyAssignment** : Enregistrement liant un utilisateur a une agence pour une periode donnee (date de debut, date de fin optionnelle).
- **AgencyTransfer** : Operation de mutation d'un utilisateur depuis son agence courante vers une nouvelle agence. Cree une nouvelle `AgencyAssignment` et cloture l'ancienne.
- **Profil_Terrain** : Profils dont les operations sont isolees a leur agence : PROMOTER, STOREKEEPER, SECRETARY, RECOVERY_MANAGER.
- **Profil_Global** : Profils ayant acces a toutes les agences : GESTIONNAIRE, ADMIN, SUPER_ADMIN.
- **AgencyId** : Identifiant technique (Long) de l'agence dans la base de donnees.
- **JWT** : JSON Web Token utilise pour l'authentification dans ELYKIA (Spring Security).
- **DataInitializationService** : Service Ionic/Angular responsable du chargement initial des donnees sur l'application mobile au demarrage de session.
- **SecurityContextInterceptor** : Intercepteur HTTP Angular qui injecte des metadonnees contextuelles (actuellement `collector`) dans les requetes mutantes.
- **Agence_Par_Defaut** : Agence de migration creee automatiquement pour accueillir les donnees existantes sans `agencyId`.
- **AgencyScope** : Filtre applique automatiquement sur les requetes de lecture selon l'agence de l'utilisateur authentifie.
- **Collector** : Champ existant sur plusieurs entites (Client, Recovery, etc.) representant le username du commercial responsable. Complementaire a l'`agencyId`.
- **Migration** : Script de mise a jour des donnees existantes pour leur attribuer un `agencyId` via l'`Agence_Par_Defaut`.

---

## Requirements

### Requirement 1: Gestion des agences (CRUD etendu)

**User Story:** En tant qu'ADMIN ou SUPER_ADMIN, je veux creer, consulter, modifier et desactiver des agences, afin de gerer le referentiel des sites de l'entreprise.

#### Acceptance Criteria

1. THE Agency_Service SHALL exiger que le champ `code` soit unique parmi toutes les agences actives lors de la creation et de la modification.
2. THE Agency_Service SHALL exiger que les champs `name` et `code` soient non vides et non nuls lors de la creation d'une agence.
3. WHEN une agence est creee avec un `code` deja utilise par une agence active, THEN THE Agency_Service SHALL rejeter la demande avec un message d'erreur precisiant le conflit.
4. WHEN une agence est desactivee, THE Agency_Service SHALL verifier qu'aucun utilisateur actif n'est encore affecte a cette agence avant de proceder.
5. IF une agence possede des utilisateurs actifs au moment de la desactivation, THEN THE Agency_Service SHALL rejeter la desactivation et retourner la liste des utilisateurs bloquants.
6. THE Agency_Controller SHALL exposer les endpoints CRUD sur `/api/v1/agencies` avec controle d'acces reserve aux profils ADMIN et SUPER_ADMIN.
7. THE Agency_Controller SHALL exposer un endpoint `/api/v1/agencies/all` retournant la liste complete des agences actives, accessible aux Profil_Global.
8. WHEN une agence individuelle est consultee par son identifiant via `GET /api/v1/agencies/{id}`, THE Agency_Service SHALL inclure le nombre d'utilisateurs actuellement affectes a cette agence dans la reponse. Cette information n'est pas incluse dans les listes d'agences.

---

### Requirement 2: Affectation d'un utilisateur a une agence

**User Story:** En tant qu'ADMIN, je veux affecter un utilisateur de type Profil_Terrain a une agence, afin que ses operations soient cloisonnees au perimetre de cette agence.

#### Acceptance Criteria

1. THE Assignment_Service SHALL garantir qu'un utilisateur appartenant a un Profil_Terrain possede au plus une `AgencyAssignment` active (sans date de fin) a tout instant.
2. WHEN un utilisateur de type Profil_Terrain est cree, THE Assignment_Service SHALL autoriser la creation du compte mais THE User_Service SHALL maintenir le compte dans un etat inactif jusqu'a ce qu'une agence lui soit assignee.
3. WHEN un utilisateur Profil_Terrain inactif recoit une `AgencyAssignment`, THE Assignment_Service SHALL activer automatiquement le compte utilisateur.
4. WHEN un utilisateur est affecte a une agence, THE Assignment_Service SHALL enregistrer une `AgencyAssignment` avec la date d'effet, l'identifiant de l'utilisateur et l'`AgencyId`.
5. THE Assignment_Service SHALL rejeter toute tentative d'affectation a une agence inexistante ou desactivee.
6. THE User_Service SHALL exposer l'`AgencyId` courant de chaque utilisateur de type Profil_Terrain dans la reponse de consultation d'un utilisateur.
7. WHERE le profil d'un utilisateur est GESTIONNAIRE ou ADMIN, THE Assignment_Service SHALL autoriser la creation du compte sans affectation d'agence obligatoire.

---

### Requirement 3: Historique des mutations d'agence

**User Story:** En tant que manager, je veux consulter l'historique des transferts d'agence d'un utilisateur, afin de retracer son parcours entre les sites.

#### Acceptance Criteria

1. WHEN un utilisateur est transfere vers une nouvelle agence, THE Transfer_Service SHALL cloturer l'`AgencyAssignment` courante en renseignant sa date de fin avec la date du transfert.
2. WHEN un utilisateur est transfere vers une nouvelle agence, THE Transfer_Service SHALL creer une nouvelle `AgencyAssignment` avec la nouvelle `AgencyId` et la date d'effet du transfert.
3. THE Transfer_Service SHALL rejeter un transfert si l'utilisateur n'a pas d'`AgencyAssignment` active.
4. THE Transfer_Service SHALL rejeter un transfert vers l'agence a laquelle l'utilisateur est deja actuellement affecte.
5. THE Assignment_Repository SHALL conserver toutes les `AgencyAssignment` passees (historique immuable) sans suppression physique d'un enregistrement d'historique.
6. THE Agency_Controller SHALL exposer un endpoint `/api/v1/agencies/users/{userId}/history` retournant la liste ordonnee par date decroissante des `AgencyAssignment` d'un utilisateur.
7. WHEN l'historique d'un utilisateur est consulte, THE Assignment_Service SHALL retourner pour chaque entree : l'`AgencyId`, le nom de l'agence, la date de debut et la date de fin (null si affectation encore active).

---

### Requirement 4: Isolation des donnees par agence pour les Profil_Terrain

**User Story:** En tant qu'utilisateur de terrain, je veux que mes requetes ne retournent que les donnees de mon agence, afin de ne pas etre expose aux informations des autres sites.

#### Acceptance Criteria

1. WHILE un utilisateur authentifie possede un Profil_Terrain, THE Agency_Filter SHALL restreindre automatiquement toutes les requetes de lecture sur les entites `Client`, `Recovery`, `MobileTransaction`, `StockRequest`, `StockReturn`, `CommercialMonthlyStock`, `CommercialStockMovement`, `TontineSession`, `Order`, `DailyCommercialReport`, `Inventory`, `Expense` et `AccountingDay` a l'`AgencyId` de cet utilisateur.
2. WHILE un utilisateur authentifie possede un Profil_Terrain, THE Agency_Filter SHALL interdire la creation ou la modification d'une entite operationnelle avec un `agencyId` different de celui de l'utilisateur authentifie.
3. IF une requete de lecture d'un Profil_Terrain ne comporte pas d'`AgencyId` resolvable dans le contexte de securite, THEN THE Agency_Filter SHALL rejeter la requete avec une erreur HTTP 403, independamment du statut d'authentification de la requete.
4. THE Agency_Filter SHALL operer au niveau du service backend (Spring Security / JPA) et non uniquement au niveau du frontend, afin de garantir l'isolation meme en cas d'appels directs a l'API.
5. WHEN un Profil_Terrain tente d'acceder a une entite appartenant a une autre agence par son identifiant direct, THEN THE Agency_Filter SHALL retourner une erreur HTTP 404 (ressource introuvable) afin de ne pas reveler l'existence de la ressource.

---

### Requirement 5: Vue globale et filtrage par agence pour Profil_Global

**User Story:** En tant que GESTIONNAIRE ou ADMIN, je veux pouvoir consulter les donnees de toutes les agences ou filtrer par agence, afin de produire des rapports consolides ou cibles.

#### Acceptance Criteria

1. WHILE un utilisateur authentifie possede un Profil_Global, THE Agency_Filter SHALL retourner les donnees de toutes les agences lorsqu'aucun filtre d'agence n'est applique.
2. WHEN un Profil_Global authentifie fournit un parametre `agencyId` dans sa requete, THE Agency_Filter SHALL restreindre les resultats aux seules entites appartenant a l'agence specifiee.
3. THE Agency_Filter SHALL garantir que l'ensemble des donnees retournees par un filtre `agencyId` est un sous-ensemble strict de l'ensemble retourne sans filtre, pour un meme Profil_Global.
4. THE Agency_Controller SHALL exposer un endpoint `/api/v1/agencies/{agencyId}/summary` retournant le nombre de clients, de credits actifs, de recouvrements et le solde de caisse pour l'agence specifiee, accessible aux Profil_Global uniquement.
5. WHEN un Profil_Global demande un resume pour un `agencyId` inexistant, THEN THE Agency_Service SHALL retourner une erreur HTTP 404.

---

### Requirement 6: Propagation de l'AgencyId dans le JWT

**User Story:** En tant que developpeur backend, je veux que le JWT contienne l'`agencyId` de l'utilisateur, afin que chaque service puisse appliquer le cloisonnement sans requete supplementaire a la base de donnees.

#### Acceptance Criteria

1. WHEN un utilisateur de type Profil_Terrain s'authentifie avec succes, THE Auth_Service SHALL inclure son `agencyId` courant dans le payload du JWT sous la cle `agencyId`.
2. WHEN un utilisateur de type Profil_Global s'authentifie avec succes, THE Auth_Service SHALL inclure la valeur `null` pour la cle `agencyId` dans le payload du JWT, signifiant un acces global.
3. THE JWT_Decoder SHALL permettre d'extraire l'`agencyId` depuis le token sans appel supplementaire a la base de donnees.
4. WHEN l'`AgencyAssignment` active d'un utilisateur change (mutation), THE Auth_Service SHALL invalider le JWT precedemment emis pour cet utilisateur afin que le prochain login genere un token avec le nouvel `agencyId`.
5. THE Auth_Response SHALL inclure le champ `agencyId` dans le JSON de reponse a la connexion, afin que les clients (Angular web, Ionic mobile) puissent le stocker localement.
6. FOR ALL utilisateurs de type Profil_Terrain, decoder le JWT puis extraire l'`agencyId` SHALL retourner l'identifiant de l'`AgencyAssignment` active de cet utilisateur au moment de l'emission du token.

---

### Requirement 7: Impact sur l'application mobile (initialisation et synchronisation)

**User Story:** En tant qu'utilisateur mobile (PROMOTER, RECOVERY_MANAGER), je veux que l'application ne charge que les donnees de mon agence au demarrage, afin de reduire le volume de donnees telechargees et d'eviter les acces non autorises.

#### Acceptance Criteria

1. WHEN la `DataInitializationService` charge les donnees au demarrage d'une session mobile, THE DataInitializationService SHALL utiliser l'`agencyId` present dans le token JWT pour filtrer chaque appel backend (clients, commercials, stocks, distributions, recouvrements, tontines, reliquats).
2. THE SecurityContextInterceptor SHALL enrichir les requetes POST, PUT et PATCH vers les endpoints operationnels avec le champ `agencyId` extrait du token JWT de l'utilisateur connecte, en plus du `collector` existant.
3. IF l'`agencyId` est absent du token JWT lors de l'initialisation mobile, THEN THE DataInitializationService SHALL interrompre l'initialisation et afficher un message d'erreur invitant l'utilisateur a contacter son administrateur.
4. WHEN les donnees sont synchronisees depuis le mobile vers le backend, THE Sync_Service SHALL inclure l'`agencyId` dans chaque entite synchronisee afin de garantir le rattachement correct en base.
5. THE DataInitializationService SHALL charger exclusivement les donnees dont l'`agencyId` correspond a celui de l'utilisateur authentifie, sans necessiter de filtre cote client apres telechargement.
6. WHEN l'`agencyId` de l'utilisateur mobile change (mutation d'agence), THE DataInitializationService SHALL declencher une purge des donnees locales de l'ancienne agence et recharger les donnees de la nouvelle agence lors de la prochaine session.

---

### Requirement 8: Migration des donnees existantes

**User Story:** En tant qu'administrateur systeme, je veux migrer les donnees existantes sans `agencyId` vers une agence par defaut, afin de garantir la coherence des donnees apres l'activation du cloisonnement multi-agences.

#### Acceptance Criteria

1. THE Migration_Script SHALL creer une `Agence_Par_Defaut` avec le code `DEFAULT` si aucune agence n'existe en base avant l'execution de la migration.
2. THE Migration_Script SHALL assigner l'`agencyId` de l'`Agence_Par_Defaut` a toutes les entites operationnelles (`Client`, `Recovery`, `MobileTransaction`, `StockRequest`, `StockReturn`, `CommercialMonthlyStock`, `CommercialStockMovement`, `TontineSession`, `Order`, `DailyCommercialReport`, `Inventory`, `Expense`, `AccountingDay`) dont le champ `agencyId` est NULL.
3. WHEN la migration est terminee, THE Migration_Script SHALL produire un rapport listant le nombre d'entites migrees par type.
4. THE Migration_Script SHALL etre idempotent : une deuxieme execution ne doit modifier aucune donnee deja migree ni creer de doublon.
5. THE Migration_Script SHALL migrer egalement les utilisateurs existants sans `AgencyAssignment` en les rattachant a l'`Agence_Par_Defaut` via une `AgencyAssignment` dont la date de debut est fixee a la date d'execution de la migration.
6. IF une entite cible possede deja un `agencyId` non nul, THEN THE Migration_Script SHALL conserver la valeur existante sans la modifier.
7. THE Migration_Script SHALL s'executer dans une transaction SQL unique afin de garantir l'atomicite : en cas d'erreur, l'integralite de la migration est annulee.

---

### Requirement 9: Securite et controle d'acces

**User Story:** En tant qu'architecte securite, je veux que le controle d'acces base sur l'agence soit applique cote serveur, afin qu'aucun contournement frontend ne puisse exposer les donnees d'une autre agence.

#### Acceptance Criteria

1. THE Security_Layer SHALL valider l'`agencyId` contenu dans le JWT a chaque requete entrante et rejeter avec HTTP 401 tout token ne contenant pas de claim `agencyId` pour un Profil_Terrain.
2. WHEN un Profil_Terrain tente une operation sur une entite dont l'`agencyId` ne correspond pas a celui de son JWT, THEN THE Security_Layer SHALL rejeter la requete avec HTTP 403 sans executer l'operation.
3. THE Security_Layer SHALL ne jamais exposer, dans un message d'erreur retourne au client, l'`agencyId` ou le nom d'une agence autre que celle de l'utilisateur authentifie.
4. THE Audit_Service SHALL enregistrer toutes les tentatives d'acces refusees par l'AgencyScope (HTTP 403) avec : l'horodatage, l'identifiant utilisateur, l'URL cible et l'`agencyId` de la ressource visee.
5. THE Agency_Management_API SHALL restreindre les operations de creation, modification et desactivation d'agence aux seuls profils ADMIN et SUPER_ADMIN.

---

## Correctness Properties (Property-Based Testing)

Les proprietes suivantes doivent etre verifiees par des tests de propriete automatises.

### Property P1 - Unicite du code d'agence (Invariant)

Pour toute paire d'agences actives `(a1, a2)` avec `a1 != a2`, la propriete `a1.code != a2.code` doit etre vraie apres toute operation de creation ou de modification.

**Pattern** : Invariant -- la contrainte d'unicite du code est preservee quelle que soit la sequence d'operations CRUD.

### Property P2 - Unicite de l'affectation active (Invariant)

Pour tout utilisateur de type Profil_Terrain `u`, le nombre d'`AgencyAssignment` actives (date de fin null) associees a `u` est toujours inferieur ou egal a 1 apres toute sequence d'affectations et de transferts.

**Pattern** : Invariant -- a tout instant, un utilisateur terrain ne peut appartenir qu'a une seule agence.

### Property P3 - Round-trip JWT avec AgencyId (Round-Trip)

Pour tout utilisateur de type Profil_Terrain `u` affecte a une agence `a`, l'operation `decode(generate_jwt(u)).agencyId == a.id` doit etre vraie.

**Pattern** : Round-Trip -- generer un JWT puis le decoder retrouve l'`agencyId` original.

### Property P4 - Isolation des donnees terrain (Invariant)

Pour tout Profil_Terrain `u` affecte a l'agence `a`, toute entite `e` retournee par une requete authentifiee par `u` verifie `e.agencyId == a.id`.

**Pattern** : Invariant -- l'ensemble des resultats retournes a un utilisateur terrain est toujours un sous-ensemble des donnees de son agence.

### Property P5 - Filtrage global sous-ensemble du total (Metamorphique)

Pour tout Profil_Global `g` et tout `agencyId` valide `a`, la cardinalite des resultats avec filtre `agencyId = a` est inferieure ou egale a la cardinalite des resultats sans filtre : `|results(g, filter=a)| <= |results(g, no_filter)|`.

**Pattern** : Metamorphique -- un filtre plus restrictif produit un sous-ensemble des resultats non filtres.

### Property P6 - Idempotence de la migration (Idempotence)

Pour tout etat de base de donnees `S`, l'execution successive de la migration deux fois produit le meme etat final : `migrate(migrate(S)) == migrate(S)`.

**Pattern** : Idempotence -- la migration appliquee plusieurs fois ne modifie pas les donnees deja migrees.

### Property P7 - Coherence historique des mutations (Invariant)

Pour tout utilisateur `u` avec un historique d'`AgencyAssignment` `[a1, a2, ..., an]` (ordonnees par date de debut croissante), pour tout `i < n` : `ai.dateFin == ai+1.dateDebut` et `ai.dateFin` est non null. Seule `an.dateFin` peut etre null (affectation active).

**Pattern** : Invariant -- les periodes d'affectation d'un utilisateur ne se chevauchent pas et ne comportent pas de trous.

### Property P8 - Condition d'erreur : acces inter-agence (Condition d'erreur)

Pour tout Profil_Terrain `u` affecte a l'agence `a1` et toute entite `e` appartenant a l'agence `a2` (avec `a1 != a2`), toute tentative d'acces a `e` par `u` produit une erreur HTTP 403 ou HTTP 404.

**Pattern** : Condition d'erreur -- les inputs invalides (mauvaise agence) sont correctement rejetes.
