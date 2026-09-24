# Guide des Ventes, Crédits, Recouvrements et Commandes

Le module **Ventes** et le module **Commandes** constituent le moteur commercial de la plateforme ELYKIA. Ils permettent d'enregistrer des ventes au comptant ou à crédit, de suivre le remboursement quotidien des contrats, de gérer les retards et les échéances, d'organiser les réaffectations de dossiers entre commerciaux, de régulariser des ventes de rattrapage et de transformer les réservations clients en ventes effectives.

> [!NOTE]
> **Visibilité selon votre profil d'utilisateur** :
> - **En tant que commercial** : vous visualisez exclusivement vos propres ventes, vos clients rattachés et les articles présents dans votre stock commercial.
> - **En tant que gestionnaire ou responsable d'agence** : vous avez accès à l'ensemble des ventes de l'agence avec la possibilité de filtrer sur n'importe quel commercial.
> - **Habilitations** : si certaines fonctionnalités, boutons ou indicateurs décrits dans ce manuel ne s'affichent pas sur votre écran, c'est que vous ne disposez pas des habilitations nécessaires (contactez votre administrateur).

---

## 1. Vue d'ensemble de la navigation commerciale

Le menu latéral gauche vous donne accès aux espaces de vente selon vos attributions :

| Menu / Écran | Ce que vous y trouvez | Utilisation au quotidien |
|---|---|---|
| **Ventes > Liste** | Le tableau de bord principal des ventes, la recherche multicritères, le suivi des statuts, la fusion de crédits et les réaffectations. | Suivre les contrats en cours, valider les dossiers, enregistrer les encaissements ou réassigner des portefeuilles. |
| **Ventes > Retards** | La liste des crédits présentant des impayés (délais dépassés ou échéances dues). | Prioriser les visites de relance, consigner les contrôles terrain et clôturer les dossiers compromis. |
| **Ventes > Échéances** | Le calendrier des montants attendus aujourd'hui, cette semaine ou sur une date précise. | Anticiper les rentrées de fonds et préparer les tournées quotidiennes. |
| **Ventes > Recouvrements** | Le journal chronologique de tous les encaissements perçus. | Contrôler la traçabilité des règlements et rectifier d'éventuelles erreurs de saisie. |
| **Ventes > Transfert Ventes** | Le rapport de passation de portefeuilles entre commerciaux. | Auditer les transferts de contrats entre un commercial cédant et un commercial repreneur. |
| **Ventes > Rattrapages** | L'outil de régularisation de ventes passées. | Enregistrer des ventes historiques adossées à d'anciens stocks résiduels sans toucher au stock central actuel. |
| **Ventes > Articles** | Le tableau récapitulatif des volumes vendus par article et par commercial. | Analyser les performances de vente sur une période donnée (jour, semaine, mois). |
| **Ventes > Annulation Ventes** | Outil d'audit et d'annulation de ventes commerciales avec restitution de stock. | Simuler et exécuter l'annulation de ventes sans recouvrement (ADMIN), consulter l'historique et les rapports PDF (ADMIN, GESTIONNAIRE). |
| **Commandes** | Le registre des précommandes et réservations clients. | Traiter les demandes d'achat des clients et les convertir en ventes réelles en un clic. |

---

## 2. Tableau de bord des ventes (Menu Ventes > Liste des ventes)

L'écran principal rassemble la totalité des opérations de vente de votre périmètre.

### Les indicateurs financiers de vente
En haut de page, les cartes synthétiques vous présentent la situation financière sur la période choisie :
- **Total Ventes** : Nombre d'opérations de vente enregistrées.
- **Montant Total** : Valeur totale cumulée des contrats signés (en FCFA).
- **Montant Encaissé** : Somme des acomptes initiaux et de l'ensemble des mises journalières perçues.
- **Solde Restant** : Montant global qui reste à recouvrer.
- **Taux de Recouvrement** : Pourcentage financier recouvré (`Montant Encaissé / Montant Total`).

### Filtres temporels et recherche avancée
1. **Filtres de période rapides** :
   - `Aujourd'hui` : Ventes du jour.
   - `Cette semaine` : Ventes du lundi au dimanche en cours.
   - `Ce mois` : Ventes depuis le premier jour du mois civil.
   - `Personnalisée` : Choix libre d'une date de début et d'une date de fin.
2. **Recherche rapide** : Tapez directement une référence de contrat ou le nom d'un client.
3. **Recherche avancée multicritères** :
   - Mot-clé général (nom client, référence contrat ou référence de rattrapage).
   - Type de client (particulier, entreprise).
   - Type de vente (Crédit ou Comptant).
   - Statut du contrat (Enregistré, Validé, En cours, Soldé).
   - Commercial (pour un gestionnaire, sélection du commercial à auditer).

### Indicateurs visuels d'échéance (Pastilles colorées)
Chaque ligne de vente affiche une pastille colorée indiquant le nombre de jours restants avant l'échéance :
- 🟢 **Vert** : Plus de 5 jours restants avant la fin du contrat (situation normale).
- 🟡 **Orange** : Moins de 5 jours restants (alerte échéance imminente).
- 🔴 **Rouge** : 0 jour restant ou date d'échéance dépassée (retard contractuel).

### Les étapes de vie d'un contrat de vente
Une vente progresse selon des étapes claires garantissant la sécurité des marchandises et des fonds :

| Statut du contrat | Ce que cela signifie | Actions disponibles |
|---|---|---|
| **Enregistré** | La vente vient d'être saisie. La marchandise n'est pas encore sortie du stock. | - **Valider** : Approuve le contrat de vente.<br>- **Modifier** : Corrige les articles, acomptes ou informations client.<br>- **Supprimer** : Annule la saisie erronée. |
| **Validé** | Le contrat est approuvé administrativement. Les articles sont prêts à être remis au client. | - **Démarrer** : Confirme la remise physique des articles au client et déstocke automatiquement le matériel du stock du commercial.<br>- **Détails** : Ouvre la fiche complète du dossier. |
| **En cours** | La marchandise a été livrée, le crédit est actif et en cours de remboursement. | - **Encaisser** : Ouvre directement la fenêtre de paiement pour saisir une mise quotidienne (avec rappel du reliquat disponible).<br>- **Modifier la mise** : Réajuste le montant journalier convenu.<br>- **Détails** : Consultation 360°. |
| **Soldé** | Le client a remboursé la totalité de son crédit. Le solde restant dû est à zéro. | - **Consulter** : Historique complet, date de clôture effective et archivage. Les dossiers soldés ne sont plus modifiables. |

### Actions groupées : Réaffectation et Fusion de crédits
- **Changer de commercial en lot** :
  1. Cochez les cases des ventes en cours que vous souhaitez réaffecter (les dossiers déjà soldés ne sont pas sélectionnables).
  2. Cliquez sur **Changer le commercial**.
  3. Sélectionnez le nouveau commercial dans la liste déroulante.
  4. Validez : l'ensemble des contrats cochés est transféré au nouveau commercial en une seule opération.
- **Fusionner plusieurs crédits** :
  1. Cliquez sur le bouton **Fusionner**.
  2. Sélectionnez le commercial concerné.
  3. Choisissez entre **2 et 10 crédits en cours** appartenant à ce commercial pour un même client.
  4. Cliquez sur **Confirmer la fusion**.
  5. Le système consolide les soldes restants et les articles en un contrat unique avec une nouvelle référence, puis clôture proprement les anciens dossiers.

---

## 3. Enregistrer une nouvelle vente (Bouton Nouvelle vente)

Pour créer une vente, cliquez sur le bouton bleu **« + Nouvelle vente »** en haut à droite (ou depuis le menu **Ventes > Nouvelle vente**).

### Choisir entre Vente à Crédit et Vente au Comptant

| Critère | Vente à Crédit | Vente au Comptant |
|---|---|---|
| **Commercial responsable** | **Obligatoire**. En tant que commercial, votre nom est automatiquement renseigné. En tant que gestionnaire, vous choisissez le commercial qui portera la vente. | Non requis. La vente est une opération directe en boutique. |
| **Choix du client** | La liste propose les clients déjà rattachés au commercial sélectionné. | Recherche universelle parmi l'ensemble des clients de l'agence. |
| **Articles et stock disponible** | Les articles sont déduits du **Stock Commercial** de l'agent. Seuls les articles que le commercial a effectivement en sa possession peuvent être vendus. | Les articles sont recherchés directement dans le stock général du magasin. |
| **Prix appliqué** | Prix de vente à crédit (prix contractuel avec marge tontine/crédit). | Prix de vente au comptant. |
| **Paiement et échéances** | Saisie d'une avance initiale facultative, calcul automatique du solde restant dû, de la mise journalière et de la date de fin prévue. | Règlement intégral immédiat au comptoir. Aucun échéancier journalier. |
| **Usage du crédit** | Choix entre usage **Personnel** ou **Professionnel** si le client bénéficie de l'habilitation crédit professionnel. | Sans objet. |

### Reçu de caisse et impression immédiate
Si l'impression immédiate est activée dans votre agence :
1. Dès que vous enregistrez la vente, une fenêtre affiche l'aperçu du ticket de caisse thermique (format 80 mm).
2. Le reçu détaille : l'en-tête ELYKIA, la référence unique du contrat, le nom et téléphone du client, le nom du commercial, la liste des articles avec prix et quantités, le total, l'acompte versé, le solde restant et la mise journalière convenue.
3. Cliquez sur **Imprimer** pour sortir le ticket destiné au client.

---

## 4. Fiche détaillée 360° d'un crédit

En ouvrant un crédit, vous accédez à un dossier complet regroupant l'ensemble des aspects contractuels, financiers et logistiques :

### 1. Jauge de progression du remboursement
- Barre graphique indiquant le pourcentage remboursé à date.
- Rappel du montant déjà payé par rapport au montant total du contrat.
- Décompte du montant restant dû et du nombre de jours contractuels restants.
- Date de début et date de fin prévue (ou date de fin effective si le crédit est soldé).

### 2. Indicateurs financiers du contrat
- **Montant Total** : Valeur totale de la vente en FCFA.
- **Déjà Payé** : Somme de l'acompte initial et des règlements journaliers perçus.
- **Restant Dû** : Montant net qui reste à percevoir.
- **Mise Journalière** : Somme quotidienne attendue selon le contrat.

### 3. Informations sur le client et reliquat
- Nom, prénom, pièce d'identité, téléphone et adresse.
- Lien direct vers sa fiche client complète.
- **Affichage du Reliquat** : Le solde disponible en reliquat chez ce client apparaît en vert s'il est positif. Cela permet de savoir immédiatement si le client possède un avoir qui peut être utilisé pour régler sa mise.

### 4. Commercial responsable et historique des transferts
- Nom du commercial actuellement en charge du dossier.
- Bouton **Modifier** : Permet à un responsable de réassigner ce crédit à un autre commercial.
- **Lien vers le stock source** : Permet de retrouver en un clic le lot mensuel d'origine duquel proviennent les articles livrés.
- **Historique des transferts** : Frise chronologique retraçant tous les changements de commercial intervenus sur ce contrat (date, ancien commercial, nouveau commercial, solde restant au moment de la passation).

### 5. Consentement numérique et Contrôle terrain
- **Codes de consentement** : Affiche les codes de confirmation générés lors des opérations mobiles pour garantir l'accord du client.
- **Contrôle terrain** : Si un chef de recouvrement a inspecté le carnet du client, cette section affiche le montant système, le montant noté sur le carnet papier, l'écart éventuel, le statut (🟢 **Conforme** ou 🔴 **Disparité**) ainsi que les observations de l'auditeur.

### 6. Articles livrés
Tableau listant chaque article avec sa désignation, sa catégorie, la quantité livrée, son prix unitaire et le montant total de la ligne.

### 7. Situation de recouvrement et compteurs de retard
Un bandeau évalue la ponctualité des règlements du client :
- 🟢 *À jour — aucun retard* (0 jour de retard).
- 🟡 *Léger retard de paiement* (1 à 5 jours de retard).
- 🔴 *Retard significatif* (plus de 5 jours de retard).
- **Les 4 compteurs de contrôle** :
  1. *Jours écoulés* : Nombre de jours passés depuis la signature.
  2. *Jours payés* : Nombre de jours de mise effectivement couverts par les paiements du client.
  3. *Jours de retard* : Différence entre les jours écoulés et les jours payés.
  4. *Jours restants* : Nombre de jours restant avant l'échéance finale.

### 8. Historique des paiements et droit d'annulation
Chaque mise encaissée apparaît dans la liste chronologique avec sa date, son heure, la référence du reçu et le nom du commercial qui a perçu l'argent.
- Un badge indique si le montant correspond à la **Mise normale** ou à une **Mise spéciale** (paiement partiel ou avance de plusieurs jours).
- En cas d'erreur de saisie, un utilisateur habilité peut cliquer sur **Annuler** : le système demande confirmation et corrige immédiatement le solde du crédit ainsi que le journal de caisse.

### 9. Historique des changements de mise
Si la mise quotidienne a été renégociée, un tableau consigne chaque modification : ancienne mise $\rightarrow$ nouvelle mise, solde restant à ce moment-là, auteur et date du changement.

---

## 5. Gestion des impayés et retards (Menu Ventes > Retards)

L'écran **Retards** est l'outil principal de pilotage pour le chef de recouvrement et le gestionnaire :
- **Indicateurs clés** : Nombre total de dossiers en retard, nombre de délais dépassés, nombre d'échéances du jour et montants financiers correspondants.
- **Filtres de travail** : Filtrage par commercial, par mois, par quartier/localité et par type de retard (délai expiré ou échéance du jour).
- **Clôture exceptionnelle** : Permet de solder administrativement un crédit irrécouvrable en consignant le motif.
- **Saisie de contrôle terrain** : Permet au chef de recouvrement d'enregistrer directement le montant constaté sur le carnet du client.
- **Export PDF** : Génère une feuille de route pour la tournée de recouvrement avec les adresses, numéros de téléphone et montants exigibles.

---

## 6. Calendrier des échéances (Menu Ventes > Échéances)

Le sous-menu **Échéances** permet d'anticiper les règlements attendus :
- Visualisation des échéances du jour, de la semaine ou d'une date choisie sur calendrier.
- Filtre par commercial pour mesurer la charge d'encaissement de chaque collaborateur.

---

## 7. Journal des recouvrements (Menu Ventes > Recouvrements)

Le sous-menu **Recouvrements** est le registre des encaissements de crédits :
- Il présente la totalité des versements perçus jour après jour.
- Vous pouvez filtrer par plage de dates (*du ... au ...*) et par commercial.
- Pour chaque ligne, vous retrouvez la référence, le client, le commercial, le montant versé et l'heure exacte.
- Les profils autorisés peuvent annuler un encaissement erroné avec recalcul instantané des soldes.

### Encaissements à distance par Mobile Money
Vos clients ont également la faculté de régler leurs échéances sans attendre votre passage grâce à l'Espace Client ELYKIA :
- Le client effectue son transfert vers le numéro Mobile Money (Mixx by YAS ou Moov Money) attribué à son commercial référent.
- Il déclare son règlement sur son portail en indiquant le numéro de transaction opérateur.
- La soumission parvient instantanément dans le menu latéral gauche **Paiements clients** où elle est rattachée au commercial responsable du dossier.
- Dès la validation de la déclaration, l'échéance du crédit est automatiquement soldée et le montant s'ajoute à vos recouvrements du jour.

---

## 8. Rapport de transfert des ventes (Menu Ventes > Transferts)

Le rapport de passation permet de suivre avec précision les mouvements de portefeuille :
- Filtres par commercial cédant, commercial repreneur et période.
- Statistiques globales : nombre de dossiers transférés, valeur totale des contrats, montants déjà payés et soldes restants transférés.
- Sélecteur de paires : permet de cliquer sur une passation spécifique (par exemple *Commercial A $\rightarrow$ Commercial B*) pour afficher le détail des dossiers concernés.
- **Règle d'exactitude** : Si un contrat a changé de main plusieurs fois sur la période, il n'est comptabilisé qu'une seule fois, sur son transfert le plus récent, pour éviter tout double comptage.

---

## 9. Rattrapage de ventes antérieures (Menu Ventes > Rattrapage)

Cette procédure exceptionnelle est réservée aux régularisations :
1. Elle permet d'enregistrer une vente réalisée dans le passé sans impacter le stock physique actuel du magasin central.
2. Déroulement en 3 étapes :
   - Sélection du commercial et choix de son **stock résiduel archivé**.
   - Sélection des articles et quantités vendus à l'époque dans ce lot.
   - Sélection du client, saisie de l'acompte éventuel et validation de l'échéancier.
3. Les ventes de rattrapage reçoivent une référence distinctive pour faciliter leur suivi comptable.

---

## 10. Rapport des articles vendus (Menu Ventes > Articles)

Cet écran synthétise les sorties commerciales de l'agence :
- Regroupement des ventes par **Article** et par **Commercial**.
- Affichage des quantités totales écoulées et des montants générés.
- Filtres temporels rapides (aujourd'hui, semaine, mois, personnalisé) et filtre par commercial.
- Export des données vers Excel ou PDF pour les réunions de bilan commercial.

---

## 11. Gestion des commandes clients (Menu Commandes)

Le module **Commandes** gère les précommandes et réservations avant leur contractualisation définitive.

### Le tableau de bord des commandes
Les commandes sont réparties dans 6 onglets selon leur avancement :
- **En attente** : Nouvelles demandes enregistrées nécessitant une confirmation.
- **Acceptée** : Commandes validées dont la marchandise et les modalités de paiement sont convenues.
- **Refusée** : Demandes rejetées (stock indisponible, client non éligible).
- **Annulée** : Commandes annulées par le client ou le commercial.
- **Vendue** : Commandes converties avec succès en ventes réelles.
- **Toutes** : Vue d'ensemble du registre.

### Traitement et conversion d'une commande en vente
1. **Créer une commande** : Cliquez sur **Créer une commande**, sélectionnez le client et ajoutez les articles souhaités avec leurs quantités et prix.
2. **Décision** : Les responsables peuvent accepter ou refuser la commande (individuellement ou par lot).
3. **Action « Vendre »** : Dès qu'une commande est acceptée, le bouton **Vendre** bascule directement l'ensemble des articles vers le formulaire de nouvelle vente pour créer le contrat crédit ou comptant sans aucune ressaisie manuelle, puis marque la commande comme **Vendue**.

---

## 12. Annulation de ventes d'un commercial (Menu Ventes > Annulation Ventes)

Cette fonctionnalité d'exception permet de corriger des erreurs de saisie ou d'annuler les ventes erronées d'un commercial sur une période ciblée. Elle garantit l'intégrité comptable et logistique complète du système en automatisant les contre-passations nécessaires.

### A. Rôles et niveaux d'accès
* **Administrateur (`ROLE_ADMIN`)** : Accès complet. L'administrateur peut configurer les filtres, exécuter une **simulation (Dry-run)** pour prévisualiser les impacts, puis déclencher l'**annulation effective** avec saisie d'un motif obligatoire.
* **Gestionnaire (`ROLE_GESTIONNAIRE`)** : Accès en **consultation seule**. Le gestionnaire peut visualiser l'historique complet des sessions d'annulation, consulter les statistiques et télécharger les pièces d'audit PDF (le formulaire et les boutons d'exécution ne lui sont pas présentés).

### B. Règles et garde-fous stricts
1. **Période restreinte au mois civil en cours** : Seules les ventes enregistrées durant le mois en cours peuvent être annulées. L'intervalle sélectionné ne peut pas excéder 31 jours.
2. **Ventes crédit uniquement** : les ventes comptant et les livraisons tontine sont hors périmètre. Seuls les statuts **CREATED**, **VALIDATED** et **INPROGRESS** sont annulables.
3. **Exclusion absolue des ventes avec recouvrement ultérieur** : Toute vente ayant fait l'objet d'au moins un encaissement postérieur à la conclusion du contrat (`Montant Encaissé > Avance` ou timeline de paiement active) est **strictement exclue** de l'annulation pour préserver la comptabilité de caisse. Ces dossiers sont répertoriés dans la section de rejet avec le motif explicite. En revanche, **une vente comportant uniquement une avance initiale** (sans recouvrement ultérieur) **peut être annulée** : le stock est restitué et l'avance est rétroactivement décrémentée du rapport journalier (`DailyCommercialReport` : montants d'avances et total à verser).
4. **Restitution physique et valorisation du stock commercial** : les quantités vendues, la valeur vendue et la marge associée sont réintégrées dans le stock commercial du mois. L'opération est refusée si le stock mensuel, la ligne d'article ou le rapport journalier de la date de vente est manquant.
5. **Décrémentation des rapports d'activité (`DailyCommercialReport`)** : Pour chaque date d'opération concernée, les compteurs de vente, le montant des ventes, la marge brute, les acomptes éventuels et le total à verser sont décrémentés de manière rétroactive. L'absence de rapport journalier interrompt tout le lot (aucune annulation partielle).
6. **Traçabilité dans le journal des opérations (`DailyOperationLog`)** : Une écriture en contre-passation (montant négatif, type `CREDIT_SALE_CANCEL`) est générée **à la date de la vente**, dans la même transaction que l'annulation.
7. **Archivage et audit PDF automatique** :
   - Un **bordereau individuel d'annulation** (format A4 certifié avec détails des articles réintégrés, signatures et motif) est généré pour chaque vente annulée.
   - Un **rapport de synthèse consolidé** récapitule l'ensemble du lot, les totaux régularisés et la liste des dossiers exclus.
   - Les documents sont stockés de façon pérenne sur le serveur d'objets sécurisé MinIO (avec relance automatique en tâche de fond en cas d'indisponibilité temporaire).
8. **Exécution alignée sur la simulation** : seules les ventes confirmées comme éligibles lors du dry-run sont annulées ; un échec annule toute la transaction (aucun crédit déjà modifié n'est conservé).

