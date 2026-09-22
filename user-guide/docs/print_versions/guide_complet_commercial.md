# Guide Utilisateur - Profil Commercial

_Ce document est une compilation de la documentation pour impression._

\newpage

# Guide Commercial

Ce guide présente les parcours de terrain disponibles sur le web et, dans sa dernière partie, sur l’application mobile. Votre interface montre uniquement les actions correspondant à vos droits : l’absence d’un bouton de validation, d’export ou de réaffectation est normale si l’habilitation n’est pas attribuée.

<!-- CAPTURE À INSÉRER : Menu d’un commercial avec Clients, Stock Commercial, Ventes, Tontines et Rapport Journalier. -->

## Votre cycle de travail

| Moment | Module | Objectif |
|---|---|---|
| Préparer le portefeuille | Clients | Créer et mettre à jour les informations client. |
| Obtenir les articles | Stock Commercial | Créer une demande de sortie et suivre sa livraison. |
| Distribuer et suivre | Ventes | Créer une vente, suivre son statut et encaisser les mises. |
| Collecter l’épargne | Tontines | Inscrire, collecter, suivre la progression et préparer la livraison. |
| Rendre compte | Caisse, Rapport Journalier | Contrôler les versements et les opérations de la période. |

Suivez les pages [Clients et comptes](clients_accounts.md), [Stock](stock.md), [Ventes et commandes](sales_orders.md), [Tontines](tontine.md) et [Application mobile](mobile_app.md).


\newpage



---

# Clients et comptes (Répertoire, Enrôlement & Suivi)

Le module **Clients** est le socle de l'ensemble des opérations commerciales et financières d'ELYKIA. Il centralise les données d'identité, les coordonnées géographiques, les pièces justificatives, les affectations commerciales ainsi que l'historique complet des crédits et de la tontine.

---

## 1. Rechercher et consulter la clientèle (`/client/list`)

Accessible via le menu latéral **Clients**, la vue liste fournit un accès direct à l'ensemble du portefeuille.

<!-- CAPTURE À INSÉRER : Liste web des clients avec la barre de recherche, le filtre commercial, les KPI et les boutons d'action. -->

### A. Outils de filtrage et recherche
* **Recherche instantanée** : Saisissez un nom, un prénom, un numéro de téléphone (8 chiffres) ou un nom de localité dans le champ de recherche, puis appuyez sur Entrée ou cliquez sur la loupe.
* **Sélecteur de commercial** : Permet d'isoler en un clic le portefeuille géré par un commercial précis.
* **Persistance de navigation** : La recherche, le commercial sélectionné et la pagination sont conservés dans l'état de l'application lorsque vous ouvrez une fiche client et revenez à la liste.
* **Fiche Client PDF** : Dès qu'un commercial est filtré, le bouton **« Fiche Client PDF »** devient actif pour générer le document imprimable de son portefeuille clients.

### B. Indicateurs du bandeau supérieur
Quatre cartes KPIs résument la dynamique du portefeuille affiché :
1. **Clients enregistrés** : Nombre total de clients actifs (hors dossiers supprimés).
2. **Crédit en cours** : Nombre de clients ayant au moins une vente à crédit active (`INPROGRESS`).
3. **Membres tontine** : Nombre de clients souscripteurs d'un cycle d'épargne tontine.
4. **Sans crédit ni tontine** : Prospects ou clients n'ayant aucun engagement financier actif.

---

## 2. Enrôlement d'un nouveau client (`/client/add`)

Pour créer un nouveau client, cliquez sur le bouton bleu **« + Ajouter »** en haut à droite de la liste (`ROLE_EDIT_CLIENT` ou `ROLE_PROMOTER`). Le formulaire est structuré en 7 sections normées :

<!-- CAPTURE À INSÉRER : Formulaire d'ajout client montrant l'envoi de la photo de profil, la saisie d'identité, la pièce justificative et les commerciaux. -->

### Section 1 : Identité
* **Photo de profil** :
  * Cliquez sur l'icône de l'appareil photo pour téléverser une photo d'identité (format JPG ou PNG, recadrage carré recommandé).
  * La photo est automatiquement convertie et enregistrée en base de données. Un bouton permet de la retirer ou de la remplacer si besoin.
* **Nom & Prénom** *(Obligatoires)* : Identité civile du client.
* **Adresse** *(Obligatoire)* : Adresse physique de résidence ou de commerce.
* **Numéro de téléphone** *(Obligatoire)* : Numéro principal du client (exactement 8 chiffres requis selon la numérotation nationale).

### Section 2 : Pièce d'identité
* **Type de pièce** *(Obligatoire)* : Sélection parmi les formats d'identification légaux autorisés :
  * `Carte d'électeur (CENI)`
  * `Passport`
  * `Carte nationale d'identité (ID Card)`
  * `Carte e-ID / Numéro d'Identification Unique (NIU)`
  * `Permis de conduire (Driver License)`
* **Numéro de pièce** *(Obligatoire)* : Numéro officiel d'enregistrement de la pièce d'identité.
* **Document numérisé (Fichier)** : Téléversement du scan ou de la photo de la pièce d'identité (formats acceptés : PDF, JPEG, PNG).

### Section 3 : Informations personnelles
* **Date de naissance** *(Obligatoire)* :
  * **Contrôle d'âge minimum (16 ans)** : L'application vérifie automatiquement que le client est âgé d'au moins 16 ans révolus à la date du jour. Une date inférieure à 16 ans bloque la validation avec le message d'alerte `Âge minimum 16 ans`.
* **Occupation** *(Obligatoire)* : Profession ou activité génératrice de revenus du client (ex: commerçante, couturière, artisan, etc.).
* **Localité** *(Obligatoire)* : Sélection avec autocomplétion intelligente parmi le référentiel des localités et quartiers enregistrés dans ELYKIA.

### Section 4 : Personne à contacter (Garant / Proche)
* **Nom complet** : Identité de la personne de confiance à contacter en cas d'injoignabilité.
* **Téléphone & Adresse** : Coordonnées de contact du garant.

### Section 5 : Géolocalisation
* **Mode Automatique GPS** : Cliquez sur le bouton **« Obtenir la position GPS »** pour capturer automatiquement les coordonnées géographiques actuelles depuis le navigateur ou l'appareil.
* **Mode Saisie Manuelle** : Activez l'interrupteur à bascule pour saisir directement la `Latitude` et la `Longitude` (utile pour les enregistrements a posteriori au bureau).

### Section 6 : Commerciaux associés
L'application sépare strictement les responsabilités commerciales pour une traçabilité optimale :
* **Commercial crédit** *(Obligatoire)* : Commercial chargé du recouvrement des crédits et de la distribution des articles.
* **Commercial tontine** *(Obligatoire)* : Commercial chargé des collectes de cotisations d'épargne.
* **Commercial agence** : Commercial référent rattaché à l'agence.

### Section 7 : Type & Compte
* **Type de client** *(Obligatoire)* : Choix entre `Client` (client final bénéficiaire) ou `Commercial` (compte interne promoteur).
* **Compte associé & Solde initial** :
  * **Numéro de compte** : Généré automatiquement par le système.
  * **Solde initial en FCFA** *(Obligatoire)* : Saisie du montant d'ouverture de compte, soumis à un plancher et un plafond réglementaires :
    * **Montant minimum** : `500 FCFA`.
    * **Montant maximum** : `2 000 000 FCFA`.

Cliquez sur **« Enregistrer »** pour créer le dossier client.

---

## 3. Consultation détaillée du client (`/client/view/:id`)

En cliquant sur le nom d'un client dans la liste, vous accédez à sa **Fiche Client Détaillée**, structurée pour offrir une vue à 360 degrés de sa solvabilité :

<!-- CAPTURE À INSÉRER : Fiche client détaillée avec panneau d'identité, indicateurs financiers d'achats et onglets Achats / Historiques / En Attente. -->

### A. Synthèse d'en-tête
* **Informations de profil** : Nom, téléphone, adresse, profession, numéro de compte et lien vers le commercial référent.
* **Indicateurs financiers en temps réel** :
  * **Achats en cours** : Nombre de crédits actifs.
  * **Montant total de l'achat en cours** (FCFA).
  * **Montant total dû à date** (FCFA) : Montant théorique qui devrait être remboursé selon le calendrier d'échéances.
  * **Montant total payé à date** (FCFA) : Somme réelle des remboursements déjà perçus.
  * **Achats terminés** : Nombre de crédits entièrement soldés avec succès.
  * **Achats en retard** : Nombre de crédits en défaut de paiement.

### B. Les 3 Onglets chronologiques d'opérations
1. **Onglet « Achats »** : Liste détaillée des crédits actuellement en cours (`INPROGRESS`), avec la référence, les articles associés, la mise journalière, le montant total et le reste à payer.
2. **Onglet « Historiques »** : Archives de l'ensemble des crédits soldés (`SETTLED`) ou annulés dans le passé, permettant d'apprécier la ponctualité historique du client.
3. **Onglet « En Attente »** : Dossiers de vente créés (`CREATED`) ou validés (`VALIDATED`) en attente de démarrage ou de livraison de marchandise.

---

## 4. Réaffectation en masse de portefeuille (`ROLE_ASSIGN_CLIENT_COLLECTOR`)

Lorsque les tournées sont réorganisées, les gestionnaires peuvent transférer un groupe de clients vers un nouveau commercial :

1. Cochez les cases des clients concernés dans la liste.
2. Cliquez sur le bouton d'action **« Changer de commercial (N) »**.
3. Sélectionnez le nouveau **Commercial crédit** et/ou le nouveau **Commercial tontine**.
4. **Transfert automatique des ventes** : Cochez la case *« Transférer automatiquement les ventes du commercial vers le nouveau commercial »* pour que tous les crédits en cours suivent instantanément le client chez le nouvel agent.
5. Validez l'opération.

---

## 5. Gestion des comptes financiers (`/accountlist`)

Le sous-menu **Comptes** offre une vue d'ensemble des comptes de monnaie électronique ou de dépôt rattachés aux clients et aux agents :
* Affiche pour chaque compte : le numéro de compte unique, le titulaire (client ou commercial), le type de compte et le solde actuel disponible en FCFA.
* La fiche de détail d'un compte (`/accountdetails/:id`) permet de tracer l'ensemble des écritures de débit (achats, prélèvements) et de crédit (approvisionnements, remboursements).



\newpage



---

# Stock commercial (Demandes, Suivi Mensuel & Retours)

Le **Stock Commercial** représente la marchandise physique effectivement confiée à un agent commercial pour réaliser ses ventes sur le terrain. L'agent est personnellement et financièrement comptable des articles mis à sa disposition jusqu'à leur vente enregistrée ou leur réintégration au magasin central.

---

## 1. Demander du stock au magasin (`/stock/request`)

Pour s'approvisionner, le commercial ou son responsable initie une **Demande de sortie stock**.

<!-- CAPTURE À INSÉRER : Formulaire Nouvelle demande de sortie stock avec sélection des articles, quantités et bouton d'envoi. -->

### A. Création de la demande (`/stock/request/create`)
1. Ouvrez **Stock Commercial > Demandes Sortie** et cliquez sur le bouton bleu **« + Nouvelle demande »** (`ROLE_PROMOTER` ou `ROLE_GESTIONNAIRE`).
2. Sélectionnez le commercial destinataire.
3. Ajoutez les articles souhaités dans la grille et indiquez pour chacun la quantité requise.
4. Cliquez sur **« Enregistrer »**.

### B. Cycle de vie de la demande
* **Statut `CREATED` (Créée / En attente)** :
  * La demande est enregistrée et transmise pour arbitrage.
  * Tant qu'elle n'est pas validée, le commercial ou le gestionnaire peut la **Modifier** (icône crayon) ou l'**Annuler** (icône croix rouge).
  * Le gestionnaire peut la **Valider** (icône coche verte) ou la **Refuser**.
* **Statut `VALIDATED` (Validée)** :
  * Le gestionnaire a autorisé la sortie. La demande est transmise au magasin dépôt.
  * Les articles sont physiquement préparés par le magasinier.
* **Statut `DELIVERED` (Livrée)** :
  * Le magasinier remet la marchandise au commercial et clique sur **« Livrer »**.
  * **Effet immédiat** : Les articles sont instantanément crédités dans le **Stock Mensuel** du commercial. La date et l'heure de remise physique sont figées.

---

## 2. Tableau de bord « Mon Stock » mensuel (`/stock/my-stock`)

Accessible via **Stock Commercial > Stock**, ce tableau de bord offre une analyse comptable exhaustive de la tournée du commercial, mois par mois.

<!-- CAPTURE À INSÉRER : Tableau de bord Mon Stock montrant l'accordéon mensuel, les 6 cartes de KPI et le tableau des mouvements d'articles. -->

### A. Navigation temporelle et sélection
* **Accordéon par mois** : Chaque mois d'activité fait l'objet d'un volet déroulant intitulé `[Nom Commercial] - [Mois] [Année]`.
* **Bouton « Historique »** : Permet d'afficher ou de masquer les mois civils antérieurs clôturés.
* **Télécharger rapport** : En tête de chaque panneau mensuel, un bouton d'export génère la fiche de stock mensuelle officielle au format PDF.

### B. Les 6 Indicateurs Financiers KPIs du Stock Mensuel
Chaque panneau mensuel calcule automatiquement 6 métriques financières de contrôle :

| KPI Financier | Couleur / Icône | Signification Opérationnelle | Interaction & Règle |
|---|---|---|---|
| **Valeur Stock Restant** | Bleu Cyan (`inventory_2`) | Valeur marchande des articles encore physiquement en possession du commercial. | Calculée sur la base du prix unitaire pondéré des articles non vendus. |
| **Valeur Stock Vendu** | Vert (`monetization_on`) | Montant total des ventes (crédit et comptant) conclues sur le stock du mois. | **Carte Cliquable** : Un clic ouvre instantanément la liste détaillée de l'ensemble des crédits et ventes associés. |
| **Valeur Total Dû** | Orange (`account_balance_wallet`) | Valeur globale totale de l'ensemble des marchandises confiées sur le mois (Stock restant + Stock vendu). | Représente l'engagement financier total initial du commercial. |
| **Montant Recouvré** | Vert Émeraude (`payments`) | Cumul réel des versements et encaissements perçus auprès des clients sur les ventes de ce stock. | Mesure le cash effectif rentré en caisse. |
| **Reste à Recouvrer** | Ambre (`hourglass_empty`) | Montant global restant à percevoir (Valeur du stock physique restant + créances clients non encore soldées). | Reste à recouvrer = Total Dû $-$ Montant Recouvré. |
| **Taux de Recouvrement** | Bleu Marine (`trending_up`) | Pourcentage d'efficacité de remboursement réalisé sur la valeur totale confiée. | Taux (%) = (Montant Recouvré / Valeur Total Dû) $\times$ 100. |

### C. Tableau d'analyse des mouvements par article
Au sein de chaque panneau mensuel, le tableau détaille pour chaque référence produit :
* **Article** : Nom commercial et désignation complète.
* **Pris (Magasin)** : Quantité totale livrée par le magasin central. *(Cellule cliquable pour inspecter le détail des bons de sortie).*
* **Vendu (Clients)** : Quantité totale écoulée auprès de la clientèle. *(Cellule cliquable pour ouvrir la liste des ventes clientes correspondantes).*
* **Retourné** : Quantité réintégrée au magasin central.
* **Restant** : Quantité nette actuellement détenue : $\text{Restant} = \text{Pris} - \text{Vendu} - \text{Retourné}$.
* **Valeur Restante (FCFA)** : Valorisation financière du reliquat au Prix Moyen Pondéré (PMP).

---

## 3. Retours de marchandise au magasin (`/stock/return`)

Lorsqu'un commercial souhaite réintégrer un article invendu, défectueux ou faire une fin de tournée, il crée une opération de retour dans **Stock Commercial > Retours**.

### A. Déclaration du retour (`/stock/return/create`)
1. Cliquez sur **« + Nouveau retour »**.
2. Sélectionnez le commercial, l'article et la quantité à restituer.
3. Renseignez obligatoirement le **motif du retour** (invendu, emballage détérioré, demande du client annulée).
4. Enregistrez. Le retour passe au statut **`PENDING` (En attente)**.

### B. Réception magasin
* Le magasinier vérifie l'état physique de l'article au dépôt.
* Dès que le magasinier clique sur **« Réceptionner »**, le statut bascule à **`RECEIVED`**.
* **Impact comptable immédiat** : Le stock commercial de l'agent est automatiquement déchargé de la quantité retournée, et le stock central du magasin est réapprovisionné.

---

## 4. Retour de stock antérieur (`/stock/return/historique`)

Pour les situations où des articles confiés lors d'un mois civil antérieur doivent être restitués plusieurs semaines après la clôture du mois d'origine :
* Le bouton **« Retour stock antérieur »** (`ROLE_PROMOTER`, `ROLE_GESTIONNAIRE`, `ROLE_ADMIN`) permet d'enregistrer un retour rattaché spécifiquement au mois d'origine de la dotation.
* Cela garantit que les bilans mensuels d'ouverture et de clôture ne subissent aucun décalage d'imputation comptable.



\newpage



---

# Ventes, crédits et commandes

Le menu **Ventes** rassemble la liste des crédits, les retards, échéances, recouvrements, transferts de ventes et rattrapages selon les permissions. Une vente est une opération suivie par statut ; créez-la correctement avant de solliciter une validation ou une livraison.

## Créer une vente

Dans **Ventes > Liste**, cliquez sur **Nouvelle vente**. Le formulaire permet de choisir le type **Crédit** ou **Comptant**, puis le client et les articles. Pour une vente à crédit, sélectionnez également le commercial et renseignez une avance éventuelle. Si l’option de finalité est active, le crédit peut être déclaré personnel ou professionnel pour les clients habilités.

<!-- CAPTURE À INSÉRER : Formulaire Nouvelle vente avec le sélecteur Crédit / Comptant, Client et Articles. -->

| Type de vente | Données et résultat |
|---|---|
| Crédit | Client, commercial, articles, avance optionnelle ; une mise journalière et un solde sont ensuite suivis. |
| Comptant | Client et articles ; aucun suivi de mise journalière n’est affiché sur le reçu. |

Le sélecteur de client et le sélecteur d’articles utilisent une recherche et un chargement progressif. Saisissez quelques caractères et attendez les résultats plutôt que de conclure qu’un dossier n’existe pas.

## Suivre le cycle du crédit

| Statut | Signification et action courante |
|---|---|
| `CREATED` | Vente enregistrée ; un responsable habilité peut **Valider**. |
| `VALIDATED` | Vente validée ; le magasinier peut **Démarrer** après remise de la marchandise. |
| `INPROGRESS` | Crédit en cours ; l’action **Encaisser** permet la mise, selon les droits. |
| `SETTLED` | Crédit soldé ; il n’est plus sélectionnable pour une réaffectation en lot. |

La liste propose les filtres de période KPI et une **Recherche avancée**. La case de recherche par référence permet de cibler une référence, notamment une référence de rattrapage. La fiche crédit peut afficher le stock mensuel source, l’historique des transferts de commercial et, lorsque le rôle l’autorise, le contrôle terrain.

## Encaissements, retards et transfert

Utilisez **Retards** pour identifier les crédits en retard et **Échéances** pour suivre les périodes dues. Les encaissements apparaissent dans **Recouvrements** ; leur annulation est réservée à une permission spécifique. La liste principale permet de modifier la mise d’un crédit admissible et de réaffecter plusieurs ventes non soldées si le compte dispose de la permission correspondante.

Le menu **Transfert Ventes** est un rapport de passations. Il filtre les commerciaux sortant et entrant ainsi que la période, puis présente les agrégats et le détail paginé. Une vente est comptée une seule fois dans cette lecture, sur la dernière passation pertinente.

Le sous-menu **Articles Vendus** (ou **Articles**) permet d'obtenir une vue globale des quantités totales vendues par article. Les résultats sont groupés par article et par commercial, et vous pouvez filtrer la liste sur une période donnée (aujourd'hui, cette semaine, ce mois, etc.) ou l'isoler pour un commercial spécifique.

## Commandes

Le menu **Commandes** est un parcours distinct, présent uniquement pour les comptes autorisés. Créez, consultez ou mettez à jour une commande dans l’ordre permis par ses statuts. Ne confondez pas une commande avec une vente crédit déjà démarrée.


\newpage



---

# Tontines

Le module **Tontines** suit les membres, collectes, livraisons et archives de collectes. Les actions d’écriture concernent la session active ; une session historique est affichée en lecture seule.

## Tableau de bord de la session

Dans **Tontines > Liste**, choisissez la session puis utilisez les filtres pour limiter les membres par recherche, commercial, localité ou statut de carnet. Le tableau peut fournir les exports PDF par commercial et, pour les comptes habilités, les exports de carnets vérifiés ou à vérifier. Les boutons **Ajouter un Membre** et **Ajout Multiple** sont indisponibles en session historique ou pendant un recalcul de part société.

<!-- CAPTURE À INSÉRER : Gestion des Tontines avec sélecteur de session, filtres, Ajout Multiple et barre de vérification de carnet. -->

La vérification en masse s’effectue en sélectionnant les membres puis en choisissant **Vérifier la sélection**. Sur la fiche membre, le badge précise `Carnet vérifié` ou `Carnet non vérifié`, ainsi que la date et l’auteur lorsqu’une vérification existe. Cette action est réservée à la permission dédiée ; elle peut être annulée par les mêmes comptes habilités.

## Inscrire et modifier un membre

Utilisez **Ajouter un Membre** pour sélectionner un client et définir sa mise. L’ajout multiple permet de créer plusieurs inscriptions quand le rôle le permet. Ouvrez ensuite une ligne pour consulter la fiche : montant contribué, solde disponible, part société, collectes à la livraison, progression des mois et historique des montants de mise.

## Enregistrer une collecte

Sur la fiche membre active, choisissez **Enregistrer une Collecte** pour une collecte normale ou **Collecte de rattrapage** pour une date antérieure à aujourd’hui. Le rattrapage demande de vérifier le mois ciblé et la mise journalière applicable avant confirmation. Le récapitulatif mensuel et l’historique des collectes se mettent à jour après l’enregistrement.

| Écran de contrôle | Ce qu’il permet de vérifier |
|---|---|
| Cotisations par commercial | Répartition des collectes selon l’agent qui les a réellement enregistrées ; le commercial actuel est signalé. |
| Synthèse mensuelle | Nombre de collectes, montant et équivalent en jours de mise. |
| Historique des montants de mise | Montant journalier applicable par période. |
| Contrôle terrain | Comparaison système, carnet et écart, lorsque le chef de recouvrement a saisi un contrôle. |

L’annulation d’une collecte est réservée aux comptes autorisés et peut être limitée au profil administrateur. Ne corrigez pas une collecte par une nouvelle collecte inverse sans suivre la procédure interne.

## Préparer et finaliser une livraison

Lorsque la session est fermée et que le statut de livraison le permet, utilisez **Préparer la Livraison** pour choisir les articles. Le dossier passe alors en `PENDING`. Un gestionnaire ou administrateur autorisé utilise **Valider la Livraison** ; ensuite, un compte autorisé par le rôle rapport ou édition tontine peut **Marquer comme Livré**. La fiche affiche alors les articles, le montant, la date, le commercial et le solde non utilisé éventuel.

> La livraison n’est pas réservée au seul magasinier : l’action est disponible selon les permissions `ROLE_REPORT` ou `ROLE_EDIT_TONTINE` de l’application actuelle.


\newpage



---

# Application mobile de terrain

L’application mobile ELYKIA est l'outil quotidien du commercial sur le terrain. Conçue selon une architecture **hybride et locale-d'abord (Local-First)**, elle permet de réaliser l'intégralité des opérations commerciales, logistiques et financières même en cas de coupure totale de connexion Internet. Les données sont enregistrées instantanément dans la base locale SQLite du smartphone et sont synchronisées de manière sécurisée avec le serveur central dès que le réseau est disponible.

---

## 1. Tableau de bord principal (Dashboard d'accueil)

Dès l'ouverture de session, le commercial accède au **Tableau de Bord**, véritable tour de contrôle de son activité quotidienne.

### A. En-tête et profil commercial
* **Identité du commercial** : affichage du nom complet et du nom d'utilisateur du commercial connecté.
* **Indicateur de connectivité** : pastille d'état dynamique indiquant **En ligne** (vert) lorsque le serveur central est joignable ou **Hors ligne** (gris/orange) lorsque l'application fonctionne sur sa base locale autonome.
* **Bouton de synchronisation** : situé en haut à droite, il déclenche la synchronisation manuelle des données. Une bulle de notification chiffrée (*badge*) signale le nombre exact d'opérations locales en attente d'envoi vers le serveur.
* **Sélecteur de période temporelle** : quatre filtres rapides sous forme de pastilles (*chips*) permettent de recalculer instantanément l'ensemble des indicateurs du tableau de bord :
  * **Jour** : activité de la journée en cours.
  * **Semaine** : cumul de la semaine calendaire.
  * **Mois** : cumul du mois en cours.
  * **Année** : synthèse de l'année d'exercice.

### B. Bandeau des indicateurs clés (6 KPIs financiers)
1. **Ventes (FCFA)** : valeur totale des marchandises distribuées à crédit sur la période sélectionnée.
2. **Recouvrements (FCFA)** : montant total des encaissements de mises perçus en espèces ou mobile money, avec le détail des **Reliquats nets** gérés sur les comptes clients.
3. **Sorties stock (FCFA)** : valeur marchande des articles déstockés pour les ventes et les livraisons directes.
4. **Restant à recouvrer** : solde cumulé des créances en cours restant à percevoir auprès des clients.
5. **Non distribué (FCFA)** : valeur des articles en possession du commercial non encore vendus.
6. **Tontine (FCFA)** : montant total des cotisations d'épargne collective collectées sur la période.

### C. Graphique de tendances interactif
* Un graphique comparatif visuel met en miroir les **Ventes** (courbe marine) et les **Recouvrements** (courbe verte) pour suivre l'équilibre financier de la tournée en un coup d'œil.

### D. Grille des Actions Rapides
Sous les indicateurs, six cartes d'accès rapide permettent de lancer immédiatement les actions prioritaires sans passer par les menus :
* **Nouvelle Distribution** : ouvre le formulaire de vente à crédit directe avec sortie de stock.
* **Recouvrement** : ouvre la saisie rapide des encaissements de mises journalières.
* **Nouveau Client** : ouvre le formulaire d'enrôlement d'une nouvelle cliente avec géolocalisation.
* **Rapport** : génère et affiche le rapport journalier d'activité du commercial.
* **Tontine** : ouvre le tableau de bord complet de gestion de l'épargne collective.
* **Stock** : consulte l'état des articles en dotation dans le véhicule ou la sacoche.

### E. Navigation inférieure globale (Tabs)
En bas de l'écran, une barre de navigation permanente propose 4 onglets majeurs :
* **Tableau de Bord** : retour à l'écran d'accueil général.
* **Clients** : gestion complète du portefeuille clients.
* **Distributions** : suivi des ventes à crédit et des contrats actifs.
* **Plus** : paramètres, synchronisation manuelle et automatique, filtres, historique des versements et outils de diagnostic.

<!-- CAPTURE À INSÉRER : Tableau de bord mobile avec bandeau profil, 6 KPIs, graphique des tendances et grille des actions rapides. -->

---

## 2. Module Clients et gestion du portefeuille (« Mes clientes »)

Le module **Clients** est le point de départ incontournable : il est impossible d'effectuer une distribution ou d'inscrire un membre en tontine sans disposer d'une fiche cliente enregistrée.

### A. L’onglet « Mes clientes » : consultation, recherche et filtres
Accessible depuis l'onglet **Clients** de la barre inférieure :
* **Menu contextuel d'en-tête (trois points)** :
  * Touchez l'icône d'options en haut à droite.
  * Sélectionnez **« Clients à Recouvrer »** : ce raccourci contextuel essentiel bascule instantanément de la liste globale vers la liste ciblée de tournée, regroupant par quartier les clientes ayant un crédit en cours non encore encaissé aujourd'hui.
* **Barre de recherche dynamique** : filtre en temps réel par nom, prénom ou numéro de téléphone.
* **Filtres rapides d'un appui (Chips)** :
  * **Tous** : totalité du portefeuille affecté au commercial.
  * **Crédit en cours** : isole les clientes ayant au moins une vente à crédit active.
  * **Nouveau** : liste les clientes créées localement sur le téléphone en attente de synchronisation.
  * **Par Quartier** : organise le tri par ordre alphabétique des localités.
* **Cartes clientes** :
  * **Avatar** : photo réelle ou initiales.
  * **Coordonnées** : nom complet, téléphone, adresse et quartier.
  * **Solde** : solde comptable du compte.
  * **Badges** : `Crédit` (crédit actif), `Local` (création locale non synchronisée), `Sync` (synchronisé).
* **Bouton flottant (FAB +)** : situé en bas à droite pour enrôler immédiatement une nouvelle cliente.

<!-- CAPTURE À INSÉRER : Écran Mes clientes avec recherche, filtres rapides et menu contextuel Clients à Recouvrer. -->

### B. Fiche détaillée d’un client (3 onglets)
Un appui sur une cliente ouvre son dossier complet :
* **En-tête** : photo agrandie, nom, adresse et **bouton d'appel direct en 1 clic** (icône téléphone) pour joindre la cliente sans quitter l'application.
* **Menu d'options (trois points)** : accès aux actions **Modifier** ou **Supprimer** (pour les fiches locales non synchronisées).
* **Onglet 1 : Informations** :
  * État civil, profession, contact et pièce d'identité avec bouton **« Voir la photo de la pièce »**.
  * Nom et contact du garant (personne à contacter).
  * Numéro de compte et **Reliquat disponible** affiché en vert (avoir en FCFA utilisable pour solder les mises).
  * Coordonnées GPS et bouton **« Voir sur la carte »** ouvrant la carte Leaflet hors ligne avec marqueur précis sur la position enregistrée.
* **Onglet 2 : Crédits** :
  * Contrats de crédit en cours, montants totaux, montants déjà payés, soldes restants et jauges de progression en pourcentage.
  * Clic direct sur un crédit pour basculer en recouvrement avec contrat pré-sélectionné.
* **Onglet 3 : Historique** :
  * Timeline chronologique complète des flux financiers (distributions en bleu, encaissements en vert) avec dates, heures et références de reçus.

<!-- CAPTURE À INSÉRER : Fiche client avec les 3 onglets Informations, Crédits et Historique. -->

### C. Enregistrer un nouveau client sur le terrain
Depuis le bouton **+** ou l'action rapide **Nouveau Client** :
1. **Photo de profil** : capture du visage via l'appareil photo du smartphone.
2. **Identité & Contrôles stricts** :
   * Nom, prénom et profession.
   * **Contrôle d'âge strict (18 ans minimum)** : l'application bloque l'enregistrement si la cliente est mineure.
   * **Contrôle du téléphone** : saisie d'un numéro togolais valide à 8 chiffres avec détection anti-doublon en base locale.
3. **Pièce d'identité numérisée** : choix du type (*CNI*, *Passeport*, *Carte d'électeur*, *Carte e-ID*), saisie du numéro officiel et capture photo du document.
4. **Adresse et Géolocalisation GPS native** :
   * Adresse complète et sélection de la localité/quartier.
   * Bouton **« Obtenir la position GPS »** : acquisition automatique des coordonnées de latitude et longitude du commerce ou du domicile.
5. **Garant & Compte** : coordonnées de la personne ressource et solde initial (0 FCFA).
6. **Enregistrement Local-First** : la fiche est stockée immédiatement dans SQLite avec un identifiant temporaire UUID. Elle est instantanément utilisable pour des ventes ou cotisations hors ligne.

---

## 3. Module Distribution (Ventes à crédit)

Une fois la cliente enregistrée dans le portefeuille, le commercial peut procéder à la vente à crédit de marchandises depuis sa dotation physique.

### A. L’onglet Distributions : suivi et historique
Accessible depuis l'onglet **Distributions** de la barre inférieure :
* **Bandeau de KPIs** : Total des ventes, Nombre de crédits en cours (`INPROGRESS`), Montant global distribué en FCFA.
* **Barre de recherche** : par nom de cliente ou référence contrat (`DIST-...`).
* **Cartes de distribution** : date d'octroi, référence, nom cliente, articles remis, mise journalière (ex. *2 articles · 1 200 FCFA/jour*), montant total, badge d'état (*En cours*, *Terminé*, *En retard*) et badge de synchronisation (*Local* ou *Sync*).

### B. Fiche détaillée d’une distribution
Affiche la synthèse du contrat, la jauge visuelle de progression, la ventilation financière (mise journalière, avance versée, montant payé, restant dû, total), la liste détaillée des articles remis avec prix unitaire, et l'historique complet des recouvrements déjà perçus sur ce contrat.

### C. Droit à l’erreur : Modification ou Annulation locale
Tant qu'une distribution porte le badge **Local** (non synchronisée) :
* **Bouton Modifier** : réajuste les articles, quantités ou avances saisies.
* **Bouton Supprimer** : annule la vente, supprime la dette cliente et **réintègre immédiatement et automatiquement les articles dans le stock commercial du vendeur**.
* *Dès que la distribution porte le badge Sync, toute modification ou suppression sur le mobile est définitivement verrouillée.*

### D. Enregistrer une nouvelle distribution
Depuis **Nouvelle Distribution** :
1. **Sélection et vérification de la cliente** :
   * **Règle anti-surendettement** : un client ne peut cumuler plusieurs crédits standard. Si un crédit est déjà actif, la saisie est bloquée.
   * **Option Crédit Professionnel** : permet de distinguer un contrat *Personnel* d'un contrat *Professionnel* pour les clientes autorisées.
2. **Choix des articles et contrôle du stock** :
   * Seuls les articles avec stock disponible > 0 dans la dotation du vendeur sont sélectionnables.
   * Sélection des quantités avec les touches **+** et **-** (interdiction de dépasser le stock physique embarqué).
3. **Calcul financier automatique de la mise (Règles AMENOUVEVE-YAVEH)** :
   * **Durée de référence** : calculée sur 30 jours (`Total / 30`).
   * **Arrondi supérieur** : arrondi automatique au multiple de 50 FCFA supérieur (ex. 833 FCFA devient 850 FCFA).
   * **Plancher minimum strict** : la mise ne peut jamais être inférieure à **200 FCFA/jour**.
   * **Avance résiduelle automatique** : le solde non couvert par les jours entiers constitue l'avance initiale exigée.
4. **Personnalisation de l’avance** : saisie facultative d'un acompte en espèces supérieur avec recalcul immédiat de la durée.
5. **Contrôle Stock Snapshot** : vérification que les ventes du jour ne dépassent pas la dotation autorisée le matin.
6. **Validation et impression Bluetooth** :
   * Confirmation du récapitulatif.
   * Écriture locale instantanée et décrémentation du stock.
   * Affichage du contrat complet avec **QR Code sécurisé**.
   * Impression papier immédiate sur l'imprimante thermique portable Bluetooth de ceinture (ESC/POS).

<!-- CAPTURE À INSÉRER : Écran de confirmation de distribution et ticket de vente avec QR code. -->

---

## 4. Module Recouvrement des ventes à crédit (Mises journalières)

Dès lors que des ventes à crédit sont actives, le commercial entame sa tournée de recouvrement des mises quotidiennes.

### A. Préparer la tournée : « Clients à recouvrer »
* Accessible depuis **Clients → Options (trois points) → Clients à Recouvrer** ou via l'action rapide **Recouvrement**.
* Affiche exclusivement les clientes ayant des crédits en cours (`INPROGRESS`).
* **Masquage automatique** : les clientes ayant déjà payé leur mise du jour disparaissent automatiquement de la liste pour fluidifier la tournée.
* **Organisation par quartier** : regroupement géographique des clientes avec affichage du montant restant dû en rouge.
* Touchez une cliente pour ouvrir directement son formulaire de paiement.

### B. Saisie de l'encaissement et sélection des mises par pastilles
1. **Sélection du crédit** : rappel de la référence, de la mise journalière et de la jauge de progression.
2. **Grille de pastilles numériques** : pas besoin de saisir un chiffre au clavier. Touchez simplement le numéro de mise souhaité (ex. pastille 3) : l'application sélectionne automatiquement les 3 mises et calcule le montant exact dû.

### C. Gestion financière du Reliquat (Avoirs et monnaie)
* **Reliquat existant** : si la cliente a un avoir, activez **Utiliser ce reliquat pour payer** pour le déduire immédiatement de la mise. Si le reliquat couvre la totalité, la saisie espèces passe à 0 FCFA et le bouton devient **CLÔTURER AVEC LE RELIQUAT**.
* **Nouveau reliquat généré** : si la cliente remet un billet supérieur à la mise (ex. 2 000 FCFA pour 1 500 FCFA dus), activez **Conserver ce reliquat pour le client** pour créditer automatiquement son compte de l'excédent (+ 500 FCFA).

### D. Sécurités & Consentement
* **Consentement journalier** : vérification du code de sécurité de la journée (`operationConsentCode`).
* **Anti-doublon** : alerte de confirmation explicite si un recouvrement a déjà été perçu le jour même.
* **Double confirmation** : modale de vérification du montant saisi avant écriture locale.

### E. Reçu thermique Bluetooth et Droit à l'erreur
* **Ticket de caisse avec QR Code** : affichage immédiat des mentions officielles, montants, reliquats et solde restant avec QR Code d'authentification.
* **Impression Bluetooth** : sortie papier instantanée sur l'imprimante portable. Duplicata PDF stocké sur l'appareil.
* **Suppression locale** : dans la liste d'historique des recouvrements, touchez l'icône corbeille sur un encaissement **Local** pour l'annuler en cas d'erreur de saisie (le solde client et les reliquats sont instantanément rétablis).

<!-- CAPTURE À INSÉRER : Reçu de recouvrement thermique avec QR code et bouton Imprimer. -->

---

## 5. Module Tontine (Épargne collective)

Le module **Tontine** permet aux clientes d'épargner régulièrement pour acquérir des marchandises ou des lots d'équipements en fin de cycle. Il s'articule dans un ordre rigoureux : **Adhésion du membre**, **Collecte des cotisations**, puis **Livraison (Commande ou Livraison directe)**.

### A. Tableau de bord Tontine (`/tontine/dashboard`)
Accessible via l'action rapide **Tontine** du tableau de bord ou depuis le menu :
* **Bandeau de 4 KPIs** :
  1. **Membres actifs** : nombre de clientes souscrivant à la session en cours.
  2. **Total collecté** : somme globale des cotisations en FCFA épargnées sur la session.
  3. **Session** : millésime de l'exercice en cours (ex. 2026).
  4. **En attente livraison** : nombre de membres ayant terminé leur cycle ou en attente de remise des marchandises.
* **Filtres rapides d'un appui (Chips)** :
  * **Tous** : liste globale paginée de tous les adhérents.
  * **Actifs** : membres en cours d'épargne active.
  * **En attente** : membres ayant une commande de livraison en attente (`PENDING`).
  * **À faire (`todo`) — Outil stratégique de tournée** : ce filtre regroupe automatiquement les adhérents **par quartier** et n'affiche que les membres **n'ayant pas encore cotisé aujourd'hui**. Le commercial suit ainsi sa tournée rue par rue sans risque d'oubli.
* **Cartes membres** : initiale, nom complet, téléphone, périodicité, montant total cumulé, badges de livraison (*ACTIF*, *Commande*, *Validée*, *Livré*) et badges de synchronisation (*Local* / *Sync*).
* **Bouton flottant (FAB +)** : présent uniquement si la session est `ACTIVE` pour inscrire un nouvel adhérent.
* **Menu d'options (trois points)** : permet de consulter les rapports de session ou de forcer la synchronisation.

<!-- CAPTURE À INSÉRER : Tableau de bord Tontine avec les 4 KPIs et la vue groupée par quartier du filtre À faire. -->

### B. Adhésion et inscription d'un membre (`/tontine/member-registration`)
Depuis le bouton **+** du tableau de bord tontine :
1. **Sélection de la cliente** :
   * Appuyez sur **Sélectionner un client** pour ouvrir la modale de recherche.
   * La liste est automatiquement filtrée sur les clientes affectées au commercial connecté (`filterByTontineCollector`).
   * La cliente sélectionnée apparaît avec son avatar, son quartier et son numéro de téléphone.
2. **Fréquence de cotisation** :
   * Choisissez la cadence convenue : **Quotidien** (`DAILY`), **Hebdomadaire** (`WEEKLY`), ou **Mensuel** (`MONTHLY`).
3. **Montant par échéance** :
   * Renseignez le montant de la mise périodique en FCFA (minimum 100 FCFA, pas de 100 FCFA).
4. **Contrôle d'unicité strict** :
   * Un client ne peut être inscrit qu'une seule fois par session de tontine. Si le client existe déjà, l'application bloque l'inscription avec une alerte explicite.
5. **Consentement journalier obligatoire** :
   * L'application exige la validation du consentement journalier avant l'enregistrement.
6. **Mode Modification & Portée du changement (`updateScope`)** :
   * Lors de la modification d'un membre existant, si le montant de la cotisation est modifié, une section obligatoire **« Portée de la modification »** apparaît pour choisir l'impact financier :
     * **Mois en cours et futurs** : applique le nouveau montant à partir du mois courant.
     * **Mois futurs uniquement** : ne modifie le montant qu'à compter du mois prochain.
     * **Rétroactif (Tout recalculer)** : recalcule l'intégralité des échéances de la session avec ce nouveau montant.
7. **Notes / Observations** : champ libre facultatif pour consigner des instructions particulières.
8. **Enregistrement Local-First** : le membre est sauvegardé immédiatement avec un statut `PENDING` et un badge `Local` en attente de synchronisation.

<!-- CAPTURE À INSÉRER : Formulaire d'inscription d'un membre tontine avec choix de fréquence et sélecteur de portée de modification. -->

### C. Fiche détaillée du membre tontine (`/tontine/member-detail/:id`)
En touchant un membre depuis la liste :
* **En-tête** : avatar, nom complet, date d'adhésion et badge de statut de livraison coloré (*ACTIF*, *Commande*, *Validée*, *Livré*).
* **Carte Informations Tontine** : fréquence de cotisation, montant par échéance, total cotisé cumulé à ce jour (en vert) et total attendu.
* **Carte Informations Client** : téléphone, adresse, quartier et profession.
* **Carte Livraison (si existante)** : affiche le statut de la commande de biens, la date de demande, la liste des articles choisis avec quantités et prix totaux.
* **Historique des cotisations** : liste chronologique numérotée de tous les versements perçus avec dates, montants et indicateurs `Local` ou `Sync`.
* **Droit à l'erreur (Suppression d'une cotisation locale)** : sur une cotisation portant le badge `Local`, touchez l'icône corbeille rouge pour la supprimer immédiatement en cas de faute de saisie. Le total cotisé est instantanément recalculé.
* **Menu contextuel d'actions (trois points)** :
  * **Enregistrer une cotisation** : ouvre directement la collecte pour ce membre.
  * **Voir le client** : bascule vers la fiche cliente globale du module Clients.
  * **Livraison Fin d'Année** : ouvre le catalogue pour préparer la remise des articles (disponible si aucune livraison n'est en cours).
  * **Marquer comme livré** : confirme la remise physique des articles au client pour une commande validée.
  * **Modifier** : ouvre la fiche d'inscription pour ajuster le montant ou la fréquence.
  * **Supprimer** : retire le membre de la session (si aucune cotisation synchronisée ne s'y oppose).

### D. Enregistrement d'une cotisation tontine (`/tontine/collection-recording`)
Accessible via le bouton **Cotiser** de la fiche membre ou depuis le raccourci du menu :
1. **Sélection du membre** : pré-sélectionné automatiquement si lancé depuis la fiche membre, ou accessible via la barre de recherche textuelle par nom ou quartier.
2. **Montant de la cotisation** :
   * Le montant attendu est pré-rempli d'office selon la mise paramétrée du membre.
   * Le commercial peut ajuster la somme perçue (minimum 100 FCFA).
3. **Sécurités et contrôles financiers** :
   * **Contrôle de session** : si la session est fermée (`CLOSED`), toute collecte est bloquée.
   * **Code de consentement journalier** : validation obligatoire du consentement opérateur.
   * **Double confirmation du montant** : une boîte de dialogue demande confirmation de la somme physique encaissée.
4. **Attribution automatique** : calcul du mois de cotisation (`contributionMonth`) et affectation des avances éventuelles sur les mois suivants.
5. **Reçu thermique Bluetooth immédiat** :
   * Une modale présente le reçu officiel : référence de collecte, nom du membre, téléphone, montant versé, année de session, nom du commercial et **Total cotisé à ce jour** (`totalToDate`).
   * Si l'opération est réalisée hors connexion, la mention explicite **« Budget estimé hors-ligne »** est apposée.
   * Touchez **Imprimer** pour sortir le ticket thermique Bluetooth ou le partager au client.

<!-- CAPTURE À INSÉRER : Reçu thermique de cotisation tontine avec total cotisé cumulé et bouton Imprimer Bluetooth. -->

### E. Livraison de fin d'année tontine (`/tontine/delivery-creation`)
La livraison représente la concrétisation de l'épargne : le membre utilise son capital cotisé pour choisir des articles du catalogue. Accessible depuis la fiche membre via **Livraison Fin d'Année** :

#### 1. Contrôle préalable d'unicité
* Un membre ne peut bénéficier que d'une seule livraison par session. Si une livraison existe déjà pour ce membre, l'accès est strictement verrouillé.

#### 2. Calcul du budget épargné et de la « Part Société »
* Le système additionne l'ensemble des cotisations perçues pour établir le **Total épargné**.
* En fonction des paramètres de l'agence (moteur de calcul V1 ou V2), la **Part Société** (frais de gestion de la tontine prévus au contrat) est automatiquement déduite pour dégager le **Budget disponible net** dédié aux achats.
* Si des cotisations locales non synchronisées existent, un bandeau d'avertissement indique : *« Budget estimé hors-ligne — des collectes ne sont pas encore synchronisées »*.

#### 3. Bandeau de contrôle budgétaire
Trois compteurs guident la sélection en temps réel :
* **Total épargné** : budget net total du membre.
* **Sélectionné** : valeur cumulée des articles ajoutés au panier.
* **Restant** : solde d'épargne résiduel (`Budget disponible - Sélectionné`).

#### 4. Bouton intelligent « Compléter le solde »
* Le commercial peut sélectionner des articles dont la valeur dépasse légèrement le budget disponible.
* Lorsque le restant devient négatif (`remainingBudget < 0`), un bouton dédié apparaît en haut de page : **« Compléter le solde (X FCFA) »**.
* En touchant ce bouton, l'application bascule automatiquement sur l'écran d'enregistrement de cotisation avec le membre et **le montant manquant exact pré-remplis**. Dès la cotisation validée, le commercial est automatiquement ramené sur son panier de livraison avec un budget parfaitement équilibré.

#### 5. Sélection des articles en stock
* Catalogue interactif des stocks disponibles avec recherche textuelle.
* Pour chaque article : désignation, prix unitaire en FCFA et stock disponible chez le commercial.
* Ajustement des quantités avec les touches **+** et **-** (impossible de sélectionner au-delà du stock réel disponible).

#### 6. Validation : Choix du Mode d'Opération
Au moment de valider le panier, un menu d'action propose deux modes opérationnels :
* **Mode Commande (Pré-commande / `ORDER`)** :
  * Utilisé lorsque la marchandise n'est pas remise immédiatement au client (ex. préparation des colis de Noël au magasin central).
  * Enregistre le dossier avec le statut `PENDING`.
  * **Le stock commercial n'est pas décompté immédiatement.**
* **Mode Livraison directe (`DIRECT`)** :
  * Utilisé lorsque le commercial remet immédiatement les articles au client depuis son stock physique.
  * Enregistre le dossier avec le statut `DELIVERED`.
  * **Le stock commercial local est décrémenté immédiatement.**
  * Un reçu thermique officiel de livraison avec détail complet des articles remis, totaux et solde restant est immédiatement imprimé via Bluetooth.

#### 7. Clôture ultérieure : « Marquer comme livré »
* Pour les dossiers enregistrés en mode *Commande*, le commercial ou le gestionnaire retourne sur la fiche détaillée du membre une fois le colis remis physiquement.
* Il touche le bouton **« Marquer comme livré »** : l'application exige le consentement journalier, bascule le statut en `DELIVERED`, déduit définitivement les quantités du stock commercial et clôture le cycle de tontine.

<!-- CAPTURE À INSÉRER : Écran de sélection des articles de livraison tontine avec bandeau de budget et modalité Commande vs Livraison directe. -->

---

## 6. Articles, commandes clients et gestion des stocks

Ce domaine regroupe trois fonctionnalités complémentaires : la consultation du catalogue de marchandises, la prise de commandes clients à crédit, et les échanges logistiques de réapprovisionnement ou de retour avec le magasin central.

### A. Consultation des articles et du catalogue (`/tabs/article-list`)
Accessible depuis **Plus → Articles** :
* **Double segment commutable** :
  * **« Mon Stock »** : affiche exclusivement les articles physiquement disponibles dans la dotation mobile du vendeur (sacoche ou véhicule). Chaque carte indique la désignation, le type, la marque, le **Stock disponible en unités** et le prix de vente à crédit en FCFA. Ce stock diminue lors des distributions et livraisons directes tontine, et augmente lors des réapprovisionnements validés par le magasinier.
  * **« Catalogue »** : présente l'intégralité des articles actifs commercialisés par l'organisation, avec leur prix de vente à crédit officiel. Cet onglet permet au commercial de présenter les nouveautés aux clientes et de vérifier les tarifs même pour des articles qu'il ne transporte pas sur lui.
* **Recherche et fonctionnement hors ligne** :
  * La barre de recherche filtre instantanément par désignation commerciale, marque ou référence.
  * Les données sont synchronisées et mises en cache dans la base SQLite locale, garantissant une consultation rapide même sans réseau Internet.

<!-- CAPTURE À INSÉRER : Écran Articles avec le segment commutable Mon Stock (avec quantités disponibles) et Catalogue. -->

### B. Commandes clients à crédit (`/tabs/orders`)
Le module **Commandes** (accessible sous réserve d'activation sur le compte commercial) offre un parcours distinct de la distribution directe :
* **Différence clé entre Distribution et Commande** :
  * *La Distribution directe* implique que le commercial possède physiquement la marchandise en sacoche et la remet immédiatement à la cliente (déduction immédiate de stock et calcul imposé de la mise journalière).
  * *La Commande client* permet d'enregistrer une réservation ou un souhait d'achat d'une cliente sur l'ensemble du catalogue de l'agence, **sans que le commercial n'ait besoin d'avoir l'article en stock sur lui**, sans avance obligatoire exigée et sans calcul de mise imposé à cette étape. La marchandise sera approvisionnée ou livrée ultérieurement.
* **Liste et historique des commandes** :
  * Recherche par référence de commande ou par nom de cliente.
  * Compteur total des commandes et geste de tirage vers le bas (*pull-to-refresh*) pour actualiser.
* **Créer une nouvelle commande (`/orders/new`)** :
  1. Touchez le bouton **+** ou l'action **Créer une commande**.
  2. Sélectionnez la cliente via la modale de recherche de clientes.
  3. Choisissez les articles souhaités dans le catalogue général et définissez les quantités commandées.
  4. Touchez **Créer la commande** : la commande est enregistrée localement avec le statut `PENDING` et porte le badge `Local` en attente de synchronisation.
* **Fiche détaillée d'une commande (`/orders/detail/:id`)** :
  * Affiche la date, la référence officielle, les coordonnées de la cliente, le statut, le badge de synchronisation, le montant total en FCFA et la liste détaillée des articles avec quantités et prix unitaires.
* **Droit à l'erreur (Modification & Annulation)** :
  * Tant qu'une commande est à l'état modifiable (`canModify`), le commercial peut toucher **Modifier** pour ajuster les articles et quantités, ou toucher l'icône corbeille rouge en haut pour **Supprimer définitivement la commande**.

<!-- CAPTURE À INSÉRER : Liste des commandes clients et formulaire de nouvelle commande sur catalogue. -->

### C. Gestion des stocks et opérations avec le magasin central (`/tabs/stock`)
Accessible depuis l'action rapide **Stock** du tableau de bord d'accueil ou depuis l'onglet **Plus** :

Le module de stock mobile adopte une ergonomie avancée à double dimension : **le contexte métier** en haut et **le type d'opération** en bas.

#### 1. Sélecteur de contexte en en-tête (Context Pills)
Deux pilules permettent de basculer instantanément l'environnement de gestion :
* **Standard** : opérations de stock liées aux ventes à crédit ordinaires du commercial.
* **Tontine** : opérations de stock dédiées à l'approvisionnement des marchandises pour les livraisons d'épargne collective.

#### 2. Double flux logistique (Barre d'onglets inférieure)
* **Onglet Demandes (Sorties de stock)** :
  * Liste l'ensemble des demandes de réapprovisionnement transmises au magasin central.
  * Permet au vendeur de demander une dotation de marchandises au magasinier avant d'entamer sa tournée.
* **Onglet Retours (Restitutions au magasinier)** :
  * Liste les opérations de retour de marchandises vers le dépôt central.
  * Utilisé en fin de tournée ou lors des inventaires pour restituer des invendus, des articles défectueux ou des produits retournés par des clientes.

#### 3. Filtres de suivi par statut (Status Pills)
Une barre horizontale de filtres permet de suivre l'avancement logistique de chaque demande ou retour :
* **Tous** : historique complet des opérations.
* **En attente (`PENDING`)** : opération créée par le commercial, en attente de prise en charge par le magasinier.
* **Validé (`VALIDATED`)** : demande approuvée par le magasinier, colis en préparation.
* **Livré (`DELIVERED`)** : marchandise physiquement remise ou réintégrée au dépôt ; le stock commercial mobile du vendeur est automatiquement crédité ou débité.
* **Annulé (`CANCELLED`)** : opération annulée par le commercial ou rejetée par le magasinier.

#### 4. Enregistrer une nouvelle opération de stock (Bouton flottant FAB +)
Le bouton flottant s'adapte automatiquement au contexte et à l'onglet sélectionné :
* **Nouvelle Sortie Standard** : sélection des articles du magasinier et des quantités désirées pour la tournée de vente.
* **Nouveau Retour Standard** : sélection des articles à restituer avec saisie d'un **commentaire/motif obligatoire** (ex. *Invendus fin de semaine*, *Emballage abîmé*).
* **Nouvelle Sortie Tontine** : sélection des articles avec champ de **date de livraison demandée** pour synchroniser la dotation avec les remises prévues aux membres épargnants.
* **Nouveau Retour Tontine** : restitution d'articles tontine excédentaires avec motif explicatif.

#### 5. Consultation détaillée et Droit d'annulation
* Touchez n'importe quelle opération dans la liste pour ouvrir sa fiche détaillée : référence, date, statut du magasinier, motif et détail complet des articles et quantités.
* **Annulation d'une demande erronée** : tant qu'une demande ou un retour porte le statut **En attente** (`PENDING`), un bouton rouge **« Annuler la demande »** ou **« Annuler le retour »** permet au commercial de révoquer immédiatement l'opération avant que le magasinier ne commence à préparer le colis.

<!-- CAPTURE À INSÉRER : Tableau de bord Stock avec les pilules de contexte Standard/Tontine et les onglets Demandes/Retours. -->

---

## 7. Synchronisation hybride et fonctionnement hors-ligne

L'application mobile ELYKIA repose sur un moteur de synchronisation bidirectionnel hautement résilient (`SyncMasterService`), conçu pour garantir une autonomie totale sur le terrain tout en assurant l'intégrité comptable et financière des données centrales.

### A. Architecture Locale-d'abord (Local-First) & Autonomie terrain
* **Fonctionnement hors ligne permanent** : toutes les opérations (création de client, vente à crédit, encaissement de mise, cotisation tontine, remise de lot) s'écrivent d'abord de manière synchrone et sécurisée dans la base de données locale SQLite du terminal mobile.
* **Repères visuels de statut** :
  * Badge **Local** (orange) : l'opération a été enregistrée sur le smartphone mais n'a pas encore été transmise au serveur central. Les opérations locales bénéficient d'un droit à l'erreur (possibilité de modification ou d'annulation sur place).
  * Badge **Sync** (bleu) : la transaction a été réceptionnée, validée et scellée sur le serveur central. Elle ne peut plus être altérée ou supprimée depuis le smartphone.
* **Bulle de notification dans l'en-tête** : sur le tableau de bord, une bulle chiffrée sur l'icône de synchronisation indique en permanence le nombre exact d'opérations locales en attente d'envoi vers le serveur.

### B. Protocole de Sécurité & Consentement de Synchronisation
Transférer des encaissements financiers et des mouvements de stocks engage la responsabilité formelle du commercial. Avant d'exécuter la synchronisation des flux d'argent, l'application déclenche une modale de sécurité obligatoire en 3 étapes :

1. **Étape 1 : Confirmation par mot de passe** :
   * Le commercial doit saisir son mot de passe de session personnelle afin de certifier son identité et d'éviter tout envoi non consenti en cas d'accès au téléphone par un tiers.
2. **Étape 2 : Challenge de sécurité (Code à recopier)** :
   * L'application affiche un code alphanumérique unique généré aléatoirement. Le commercial doit obligatoirement le recopier dans le champ de vérification pour confirmer qu'il s'agit d'une démarche volontaire et réfléchie.
3. **Étape 3 : Engagement et responsabilité légale** :
   * Une case à cocher obligatoire atteste que le vendeur a vérifié l'exactitude des fonds perçus et assume la responsabilité comptable des montants transmis.
4. **Contrôle automatique de Caisse** :
   * Dès le consentement validé, le système interroge le serveur pour s'assurer que la caisse financière journalière de l'agence est ouverte (`cash-check`). Si la caisse est fermée, le système tente une ouverture automatique autorisée ou alerte le vendeur afin d'éviter tout rejet des encaissements.

<!-- CAPTURE À INSÉRER : Modale de consentement de synchronisation avec saisie de mot de passe, code challenge et case d'engagement. -->

### C. Écran de Synchronisation Manuelle (`/sync/manual`)
Accessible depuis l'icône de synchronisation du tableau de bord ou via **Plus → Synchronisation manuelle** :

Cet écran offre un contrôle granulaire sur l'ensemble des données locales en attente :

* **Navigation par onglets d'entités** :
  * Une barre de segments à défilement horizontal permet d'isoler les éléments en attente par catégorie métier :
    * **Clients** : nouvelles fiches, modifications, coordonnées GPS et photos.
    * **Distributions** : contrats de vente à crédit.
    * **Recouvrements** : encaissements de mises journalières.
    * **Membres** : adhésions à la tontine.
    * **Collectes** : versements d'épargne tontine.
    * **Livraisons** : remises de commandes ou de lots tontine.
* **Sélection personnalisée & Envoi en masse** :
  * Le commercial peut cocher individuellement les lignes de son choix ou utiliser l'action **« Tout sélectionner »**.
  * Le bouton flottant **FAB** en bas à droite affiche une pastille avec le nombre d'éléments sélectionnés (`selectedCount`) et permet de déclencher le téléversement du lot sélectionné d'un seul appui.
* **Synchronisation unitaire prioritaire** :
  * Sur chaque carte d'entité, un bouton de synchronisation individuel permet de téléverser immédiatement une opération urgente sans attendre les autres.
* **Résolution des blocages de dépendances (« Éditer le Parent »)** :
  * Si une opération (ex. un contrat de distribution ou un recouvrement) ne peut être synchronisée parce que la fiche cliente associée comporte une erreur, un bouton **« Éditer le parent »** ouvre directement le dossier de la cliente pour corriger l'anomalie sans avoir à chercher manuellement dans les menus.

<!-- CAPTURE À INSÉRER : Écran de synchronisation manuelle avec onglets d'entités, cases à cocher et bouton flottant de synchronisation de la sélection. -->

### D. Suivi des Erreurs et Résolution des Conflits (`/sync-errors`)
Accessible depuis l'icône d'alerte en haut de la synchronisation manuelle ou depuis **Plus → Erreurs de synchronisation** :

Lorsqu'une opération locale est rejetée par le serveur (ex. règle métier non respectée au bureau, problème d'attribution de zone), elle n'est jamais supprimée : elle est mise en quarantaine dans la boîte des erreurs.

* **Liste des erreurs de synchronisation** :
  * Présente chaque transaction en échec avec le nom de l'entité concernée, le type d'opération (`CREATE` ou `UPDATE`), la date de tentative et le motif explicite du rejet.
* **Fiche détaillée de diagnostic technique (`/sync-errors/:id`)** :
  * **Synthèse de l'incident** : nom de l'entité, type, date précise, libellé de l'erreur, code d'erreur officiel et nombre de tentatives automatiques effectuées (`retryCount`).
  * **Données de la requête (*Request Data*)** : affiche le flux JSON exact envoyé au serveur pour contrôle des champs transmis.
  * **Données de la réponse (*Response Data*)** : présente la réponse technique renvoyée par l'API pour faciliter l'assistance avec le support technique ou l'administrateur.
  * **Détails de l'entité locale (*Entity Details*)** : état actuel de la donnée stockée dans la base SQLite du téléphone.

<!-- CAPTURE À INSÉRER : Liste des erreurs de synchronisation et fiche détaillée avec visualiseur technique des données JSON. -->

### E. Paramètres et Optimisation des Données (Onglet Plus)
Depuis l'onglet **Plus**, le commercial configure le comportement réseau selon ses conditions de travail et la qualité de son forfait Internet mobile :

* **Synchronisation automatique** :
  * Interrupteur permettant d'autoriser l'application à synchroniser automatiquement les opérations en arrière-plan lorsque l'application est ouverte et qu'une connexion Internet stable est établie.
* **Économie de données cellulaires (Forfaits Data)** :
  * **Synchronisation des photos de profil** (Interrupteur) : permet de suspendre le téléchargement des photos de clientes sur le réseau mobile pour préserver le forfait data.
  * **Synchronisation des pièces d'identité** (Interrupteur) : permet de différer le téléversement des images lourdes de cartes d'identité et de passeports pour les effectuer au bureau sous connexion Wi-Fi.
* **Fréquence de synchronisation automatique** :
  * Sélecteur de cadence au choix : **30 minutes**, **1 heure**, **2 heures** ou **4 heures**.
* **Filtre de date de synchronisation** :
  * Permet de choisir la profondeur d'historique synchronisée pour alléger la bande passante : **Aujourd'hui**, **2 derniers jours**, **3 derniers jours**, **1 semaine**, **2 semaines** ou **1 mois**.

---

## 8. Clôture journalière, rapport d'activité et versement de caisse

En fin de tournée, avant de remettre les fonds à la caisse de l'agence et d'exécuter la synchronisation finale, le commercial établit son bilan journalier grâce au module **Rapport Journalier** (`/features/rapport-journalier`).

### A. Accéder au rapport d'activité
* Accessible directement depuis l'action rapide **Rapport** du tableau de bord d'accueil ou via l'onglet **Plus**.
* **En-tête du rapport** : affiche la date de la journée concernée. Lorsque l'option de consultation d'antériorité est activée (`allowPastDailyReports`), un sélecteur de date permet de rééditer les rapports de tournées passées.

### B. Synthèse d'activité : les 6 indicateurs de la journée
Le haut de l'écran présente six cartes synthétiques qui dressent le compte-rendu exhaustif des opérations réalisées :
1. **Distributions** : nombre de ventes à crédit octroyées et montant total distribué en FCFA.
2. **Recouvrements** : nombre de clients encaissés et montant total des mises collectées.
3. **Nouveaux clients** : nombre de nouvelles clientes enrôlées dans la journée et cumul des soldes initiaux.
4. **Avances encaissées** : nombre et montant total des acomptes initiaux perçus en espèces lors des distributions.
5. **Tontine** : nombre de versements et montant total des cotisations d'épargne collective collectées.
6. **Reliquats nets** : solde net des monnaies et avoirs gérés sur la journée (`Reliquats générés - Reliquats consommés`).

### C. La règle financière centrale : « Montant total à verser »
Une carte mise en évidence en grand au centre de l'écran calcule automatiquement la somme physique exacte en espèces que le commercial doit verser entre les mains du caissier de l'agence :

$$\text{Montant total à verser} = \text{Recouvrements} + \text{Avances perçues} + \text{Cotisations Tontine} + \text{Reliquats conservés (monnaie)} - \text{Reliquats utilisés (avoirs)}$$

Cette formule rigoureuse garantit un contrôle sans faille entre les écritures saisies sur le terminal et les espèces physiques rapportées de la tournée.

### D. Contrôle du détail chronologique des opérations (6 onglets)
Sous les indicateurs, six onglets permettent au vendeur de pointer chaque transaction enregistrée au cours de la journée avec son heure, le nom de la cliente, les détails du contrat ou de l'article, le montant, et son état de synchronisation :
* **Distributions** : liste des crédits accordés avec badge `Local` ou `Sync`.
* **Recouvrements** : détail de chaque reçu de mise perçu.
* **Clients** : fiches des clientes créées avec numéro de compte attribué.
* **Membres** : nouvelles adhésions tontine validées.
* **Collectes** : historique unitaire des versements d'épargne.
* **Livraisons** : remises de commandes ou lots tontine effectuées.

### E. Impression thermique Bluetooth et Export PDF de décharge
* **Impression thermique Bluetooth (Ticket récapitulatif)** : touchez le bouton **Imprimer le Rapport** en bas de l'écran ou l'icône imprimante en en-tête. Le smartphone transmet l'ordre à l'imprimante thermique de ceinture (ESC/POS) qui édite un ticket officiel de clôture détaillant la date, le nom du commercial, les totaux par catégorie, le montant net à verser et les zones de signature pour le commercial et le caissier.
* **Export PDF officiel** : touchez l'icône de téléchargement en en-tête pour générer et archiver un fichier PDF propre dans la mémoire du téléphone, partageable par messagerie ou imprimable sur feuille A4 au secrétariat.

<!-- CAPTURE À INSÉRER : Écran du Rapport Journalier avec les 6 KPIs de synthèse, la carte Montant total à verser et le bouton d'impression. -->

---

## 9. Sécurité, conformité et profil Chef de recouvrement

### A. Sécurités opérationnelles sur le terminal
* **Code de consentement journalier** : chaque matin, avant d'effectuer son premier acte commercial, encaissement ou mouvement de stock, le commercial doit valider son code de consentement journalier (`DailyConsentGuard`). Ce code sécurise la traçabilité de l'ensemble des transactions de la journée.
* **Protection par mot de passe & Renouvellement obligatoire** : après toute réinitialisation de compte effectuée par l'administrateur, le changement immédiat du mot de passe est obligatoire dès l'écran de connexion pour sécuriser l'accès aux données financières de l'agence.
* **Identification de l'appareil (Device ID)** : si la politique de gestion d'appareils de l'organisation est active, seuls les smartphones préalablement autorisés et identifiés par leur empreinte numérique peuvent se connecter au serveur ELYKIA, empêchant toute connexion depuis un appareil non homologué.
* **Mises à jour applicatives intégrées** : l'écran **Plus** affiche en permanence la version courante de l'application (ex. `v2.30.1`) et permet de vérifier la disponibilité d'une nouvelle version distribuée par l'organisation pour garantir la compatibilité des protocoles de synchronisation.

### B. Délimitation avec le parcours Chef de recouvrement
L'application mobile ELYKIA adapte dynamiquement son interface selon le profil de l'utilisateur connecté :
* **Profil Commercial** : accès à l'espace documenté dans ce guide (Dashboard commercial, Portefeuille clientes, Distributions de crédit, Recouvrement des mises, Tontine collective, Gestion du stock personnel et Rapport journalier).
* **Profil Chef de recouvrement** : si le compte connecté possède le rôle de supervision de recouvrement, l'application le dirige automatiquement vers un espace terrain distinct composé de ses propres outils : *Plan du jour par commercial et localité*, *Téléchargement du pack hors ligne*, *Traitement prioritaire des retards*, *Contrôle physique des carnets crédit et tontine*, *Clôtures totales ou partielles* et *Réaffectation des portefeuilles*. Ce parcours spécialisé fait l'objet d'un manuel dédié : [Guide mobile Chef de recouvrement](../recovery-manager/mobile.md).


\newpage



---

