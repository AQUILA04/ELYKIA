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

## 6. Stock commercial, commandes et réapprovisionnement

Accessible depuis **Plus → Articles** ou via l'action rapide **Stock** du tableau de bord :
* **Onglet « Mon Stock »** : présente la dotation physique actuellement présente dans la sacoche ou le véhicule du vendeur (articles, quantités disponibles et prix de vente à crédit). Ce stock est automatiquement mis à jour lors des distributions, des livraisons tontine ou des retours.
* **Onglet « Catalogue »** : présente l'ensemble des articles actifs commercialisés par l'agence pour consultation des prix et présentation aux clientes.
* **Commandes de réapprovisionnement** : permet de saisir une demande de dotation auprès du magasin central pour recharger son stock commercial avant la prochaine tournée.

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
