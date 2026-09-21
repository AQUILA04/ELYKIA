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

# Clients et comptes

Le module **Clients** centralise les données nécessaires aux ventes et à la tontine. Recherchez toujours un dossier existant avant de créer un client afin d’éviter les doublons.

## Rechercher et consulter

La liste affiche des KPI de portefeuille, une recherche par nom, prénom, téléphone ou localité, un filtre commercial et une pagination. Cliquez sur le nom ou sur **Voir** pour ouvrir la fiche. La fiche peut montrer les badges de crédit actif, membre tontine ou commande en cours, les informations de contact, une photo et les historiques disponibles.

<!-- CAPTURE À INSÉRER : Liste des clients avec la recherche, le filtre Commercial, les KPI et le bouton Ajouter. -->

Si un commercial est sélectionné, le bouton **Fiche Client PDF** permet l’export du portefeuille correspondant. L’export ne remplace pas la vérification de la période ou du commercial choisi.

## Créer ou modifier un client

Cliquez sur **Ajouter** puis remplissez les sections du formulaire. Les champs obligatoires affichent un astérisque.

| Section | Informations principales |
|---|---|
| Identité | Nom, prénom, adresse, téléphone à huit chiffres et photo de profil facultative. |
| Pièce d’identité | Type de pièce, numéro et document facultatif au format autorisé. |
| Informations personnelles | Date de naissance, occupation et localité recherchable. |
| Contact | Personne à contacter, si nécessaire. |
| Géolocalisation | Position GPS obtenue depuis l’appareil ou latitude/longitude saisies manuellement. |
| Commerciaux associés | Commercial crédit, commercial tontine et commercial agence. |
| Type et compte | Type client ou commercial ; solde initial lorsque la section compte est affichée. |

Validez avec **Enregistrer**. En modification, les champs liés aux commerciaux peuvent être restreints : seul un compte autorisé à l’affectation peut changer les responsables crédit ou tontine.

## Réaffecter plusieurs clients

Les comptes ayant la permission d’affectation voient des cases à cocher et le bouton **Changer de commercial**. Sélectionnez les clients, puis choisissez le commercial crédit, le commercial tontine ou les deux. L’option **Transférer automatiquement les ventes du commercial** devient disponible après sélection d’un commercial crédit ; elle transfère les ventes crédit `INPROGRESS` du portefeuille vers le nouveau commercial.

> Vérifiez la sélection avant validation. L’historique conserve la traçabilité des changements de commercial.

## Comptes

Le menu **Comptes**, lorsqu’il est visible, est distinct de la fiche client. Utilisez-le pour consulter les comptes et leurs soldes avec les droits prévus. Ne créez pas un nouveau client uniquement pour corriger une information de compte : revenez à la fiche client ou suivez la procédure de gestion de compte de votre organisation.


\newpage



---

# Stock commercial du commercial

Le stock commercial représente les articles effectivement attribués au commercial. Il est alimenté par des demandes de sortie validées et livrées, puis ajusté par les retours traités selon leur statut.

## Demander du stock

Ouvrez **Stock Commercial > Demandes Sortie**, puis sélectionnez **Nouvelle demande** si l’action est disponible. Choisissez le commercial concerné, ajoutez les articles et quantités depuis le sélecteur, puis envoyez la demande. En fin de mois, l’écran peut afficher des indications particulières pour orienter le choix de période.

<!-- CAPTURE À INSÉRER : Formulaire Nouvelle Demande de Sortie Stock avec sélection du commercial et sélecteur d’articles. -->

La liste utilise les états suivants :

| État | Ce qu’il faut faire |
|---|---|
| Créée | Attendre la validation, ou modifier/annuler si l’interface et votre rôle l’autorisent. |
| Validée | La demande est prête à être livrée par le magasinier. |
| Livrée | Les articles sont attribués au stock commercial ; vous pouvez ensuite les distribuer. |

Utilisez **Voir** pour vérifier les articles, la référence et les dates. Les filtres de période et commercial, ainsi que les exports PDF, permettent de retrouver un dossier sans modifier les données.

## Lire le stock mensuel

Dans **Stock Commercial > Stock**, les panneaux présentent les quantités prises, vendues, retournées et restantes. Les KPI complètent la lecture avec la valeur du stock restant, la valeur vendue, le montant recouvré, le reste à recouvrer et le taux de recouvrement. La valeur du stock vendu peut ouvrir le détail des ventes liées ; le bouton de rapport PDF porte sur le panneau commercial et mensuel affiché.

## Retourner des articles

Utilisez **Stock Commercial > Retours** lorsqu’un article doit revenir au stock. Créez le retour selon les articles disponibles, puis suivez la ligne jusqu’à sa réception. Un retour non réceptionné ne doit pas être présenté comme revenu en stock. Les statuts et actions proposés par la liste indiquent si vous pouvez encore modifier, annuler ou demander une réception.


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

L'application stocke l'intégralité des créations et modifications en local. La transmission au serveur central s'effectue via les mécanismes de l'onglet **Plus** :
* **Synchronisation automatique** : lorsqu'elle est activée, l'application transmet en arrière-plan les opérations locales dès qu'une connexion Internet stable est détectée.
* **Synchronisation manuelle** : accessible via l'icône de synchronisation du tableau de bord ou depuis **Plus → Synchronisation manuelle**. Elle permet de visualiser la file d'attente détaillée des transactions en attente (*Clients, Distributions, Recouvrements, Cotisations, Livraisons*) et de forcer leur téléversement en bloc.
* **Gestion des erreurs et conflits** : si une opération est rejetée par le serveur (ex. règle métier non respectée au bureau), elle est isolée dans l'écran des erreurs de synchronisation afin de permettre au commercial de corriger la saisie sans perdre ses autres données.

---

## 8. Parcours chef de recouvrement

Le profil Chef de recouvrement dispose d’un espace terrain distinct, accessible après le plan du jour, avec les onglets **Retards**, **Terrain**, **Clients** et **Plus**. Son parcours complet — contrôles de carnet, clôtures, réaffectations, pack hors ligne et synchronisation — est documenté dans le [Guide Chef de recouvrement](../recovery-manager/mobile.md).

---

## 9. Sécurité et mise à jour

* **Code de consentement journalier** : un code unique est requis chaque matin pour déverrouiller les actes d'encaissement et de sortie de stock sur le terminal.
* **Changement de mot de passe** : après une réinitialisation par l'administrateur, le changement de mot de passe est obligatoire dès la première connexion.
* **Mises à jour applicatives** : l'écran **Plus** affiche la version courante de l'application et permet de vérifier la disponibilité d'une nouvelle version distribuée par l'organisation.


\newpage



---

