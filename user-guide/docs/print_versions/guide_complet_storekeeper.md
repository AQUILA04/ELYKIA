# Guide Utilisateur - Profil Storekeeper

_Ce document est une compilation de la documentation pour impression._

\newpage

# Guide Magasinier

Le magasinier sécurise la circulation physique de la marchandise : catalogue, réceptions, inventaires, sorties, retours et stock tontine. Il ne valide pas automatiquement chaque étape ; les boutons disponibles dans les listes indiquent les actions autorisées à son profil.

<!-- CAPTURE À INSÉRER : Menu d’un magasinier avec Articles, Stock Commercial, Stock Tontine, Inventaires et Historique Entrée. -->

## Vos priorités

| Priorité | Objectif |
|---|---|
| Préparer les articles | Vérifier la référence, le type, le stock et les informations de la fiche article. |
| Réceptionner correctement | Créer une entrée puis attendre sa validation lorsqu’elle est requise. |
| Servir les demandes validées | Livrer les demandes de stock commercial ou tontine au bon statut. |
| Traiter les retours | Réceptionner les retours autorisés et conserver leur traçabilité. |
| Contrôler le physique | Participer à l’inventaire, à la saisie et au traitement des écarts selon vos droits. |

Consultez les pages dédiées pour [les articles](articles.md), [les inventaires et entrées](inventory.md), [le stock commercial](stock_commercial.md) et [le stock tontine](stock_tontine.md).


\newpage



---

# Gestion des articles et seuils de stock (Guide Magasinier)

Le catalogue **Articles** est la base de données centrale de référence pour toutes les opérations de stockage, de réapprovisionnement, de distribution et de tontine. Le magasinier s'y réfère quotidiennement pour contrôler les références, surveiller les seuils d'alerte et préparer les commandes.

---

## 1. Consulter et rechercher dans le catalogue (Menu Articles > Liste)

Accessible depuis le menu latéral gauche **Articles** (si vous ne voyez pas ce menu, vous ne disposez pas des habilitations requises), la liste présente l'ensemble des articles enregistrés.

<!-- CAPTURE À INSÉRER : Catalogue des articles avec recherche dynamique, filtre par type, quantités en stock et boutons de consultation. -->

### A. Outils de recherche et filtres
* **Recherche instantanée** : Recherchez par nom d'article, marque ou modèle.
* **Filtre par Type** : Isolez une catégorie d'articles spécifique (ex: Électroménager, Textile, Téléphonie, etc.).
* **Fiche détaillée de l'article** :
  * Cliquez sur **« Voir »** pour afficher la fiche complète.
  * Consultez l'historique chronologique de tous les mouvements de stock ayant affecté cet article (réceptions fournisseurs, sorties vers commerciaux, retours au magasin).

---

## 2. Seuils logistiques et alertes de stock

Pour éviter toute rupture de distribution sur le terrain, chaque article dispose de paramètres de réapprovisionnement surveillés par le système :

| Paramètre Logistique | Rôle dans l'Application | Comportement en cas de franchissement |
|---|---|---|
| **Point de commande** | Seuil critique de sécurité physique (quantité minimale à conserver en réserve). | Dès que le stock réel devient inférieur ou égal à cette valeur, l'article bascule dans la table **« Rupture imminente »** sur le Dashboard d'accueil avec une pastille orange. |
| **Niveau de stock optimal** | Quantité cible recommandée à détenir en réserve pour couvrir l'activité habituelle. | Sert de référence pour calculer le volume des commandes à passer auprès des fournisseurs. |
| **Stock physique (0)** | Quantité nulle en magasin. | L'article bascule dans la table **« Rupture de stock »** avec une pastille rouge d'alerte prioritaire. |

---

## 3. Règle de suppression et archivage

* **Intégrité référentielle** : Il est formellement interdit de supprimer un article qui a déjà fait l'objet d'un mouvement de stock, d'une vente ou d'une distribution.
* En cas d'arrêt de commercialisation d'une référence, modifiez son statut pour le passer à **Inactif** afin qu'il n'apparaisse plus dans les nouveaux formulaires de vente ou de demande de stock, tout en préservant l'historique comptable des opérations passées.



\newpage



---

# Inventaires et entrées de stock (Guide Magasinier)

Le magasinier est le garant de la sécurité physique des marchandises stockées dans le dépôt principal. Il supervise les entrées de nouveaux articles livrés par les fournisseurs et participe activement aux opérations d'inventaire physique.

---

## 1. Réceptionner des marchandises et créer une entrée (Menu Inventaires)

Toute marchandise déchargée au dépôt doit être immédiatement enregistrée dans le système pour amorcer le processus de contrôle.

<!-- CAPTURE À INSÉRER : Formulaire Entrées stock avec sélection des articles, quantités reçues et bouton de validation. -->

### A. Procédure d'enregistrement d'une entrée
1. Ouvrez le menu latéral gauche **Inventaires** et cliquez sur le bouton bleu **« Entrées stock »**.
2. Sélectionnez l'article reçu dans la liste déroulante.
3. Saisissez la quantité physique constatée sur le bordereau du transporteur ou du fournisseur.
4. Répétez l'opération pour chaque ligne du bon de livraison.
5. Cliquez sur **« Valider l'entrée »**.

### B. Suivi dans l'Historique des Entrées (Menu Inventaires > Historique Entrée)
* Dès la validation de la saisie, l'application génère une référence unique de réception (ex: `REC-2026-0042`) avec le statut initial **En attente**.
* **Consigne de sécurité stricte** : Une entrée en attente **n'augmente pas encore le stock disponible**. Vous ne devez jamais servir une demande de sortie sur la base d'une entrée non encore validée par le gestionnaire.
* Dès que le gestionnaire valide la réception dans son interface, le statut passe à **Validé** et la marchandise devient officiellement disponible pour les sorties.

---

## 2. Réalisation d'un inventaire physique magasin

L'inventaire physique permet de vérifier que le stock réel en rayon correspond rigoureusement aux quantités enregistrées en base de données.

<!-- CAPTURE À INSÉRER : Écran de session d'inventaire avec statut En cours, téléchargement PDF et saisie des quantités physiques. -->

### A. Les 4 étapes de l'inventaire pour le magasinier

```mermaid
graph TD
    A["1. Téléchargement du Support PDF<br/>(Feuille de comptage vierge)"] --> B["2. Comptage Physique en Rayon<br/>(Dénombrement manuel par carton/unité)"]
    B --> C["3. Saisie des Quantités Physiques<br/>(Bouton Saisir quantités physiques)"]
    C --> D["4. Examen des Écarts avec la Gestion<br/>(Surplus ou Manquants)"]
```

1. **Étape 1 : Téléchargement du support de comptage** :
   * Lorsqu'une session est ouverte (statut **En cours**), cliquez sur **« Télécharger PDF »**.
   * Ce document liste l'ensemble des références du catalogue sans afficher les quantités théoriques afin de garantir un comptage en aveugle impartial.
2. **Étape 2 : Comptage physique en rayon** :
   * Les équipes de magasin parcourent les allées et dénombrent physiquement chaque article (unités, cartons, blisters).
   * Notez soigneusement les quantités sur la fiche papier.
3. **Étape 3 : Saisie des quantités constatées** :
   * Cliquez sur **« Saisir quantités physiques »**.
   * Renseignez le nombre réel compté en face de chaque référence produit.
   * Validez la saisie.
4. **Étape 4 : Analyse contradictoire des écarts** :
   * En concertation avec le gestionnaire, examinez les écarts éventuels (`Surplus` ou `Manquant`).
   * Vérifiez si des entrées ou des sorties n'ont pas été omises avant que le gestionnaire ne procède à la clôture définitive de la session.



\newpage



---

# Gestion physique du stock tontine (Guide Magasinier)

Le module **Stock Tontine** applique les mêmes exigences de rigueur logistique que le stock commercial, mais dans un circuit **totalement étanche et isolé**.

---

## 1. Servir une sortie de stock tontine (Menu Stock Tontine > Demandes Sortie)

À l'approche des fêtes de fin d'année et de la clôture des cycles de cotisation, les commerciaux reçoivent des dotations d'articles pré-commandés par les membres tontine.

<!-- CAPTURE À INSÉRER : Liste des demandes de sortie de stock tontine avec filtres et bouton Livrer pour le magasinier. -->

### A. Contrôle et délivrance physique
1. Dans le menu latéral gauche, ouvrez **Stock Tontine > Demandes Sortie** (accessible si vous disposez des habilitations nécessaires).
2. Repérez la demande au statut **Validée**.
3. Cliquez sur **« Voir »** pour examiner le panier d'articles réservés pour les membres de la zone.
4. Rassemblez les colis correspondants et vérifiez les références avec le commercial au guichet.
5. Cliquez sur le bouton **« Livrer »**.
   * Le stock dépôt est débité du compte tontine.
   * Le commercial est crédité de sa dotation de distribution tontine.
   * La demande passe au statut **Livrée**.

> **Distinction fondamentale.** La validation de la sortie par le magasinier décharge le dépôt au profit du commercial. Elle ne marque **PAS** la livraison au client final : c'est le commercial ou le gestionnaire qui actera la remise finale au membre sur la fiche de ce dernier dans le module **Tontines**.

---

## 2. Retours d'articles tontine (Menu Stock Tontine > Retours)

Si un membre tontine a modifié son choix d'article, s'il a dépassé son solde ou si un reliquat de campagne doit être rapatrié au magasin :
1. Le commercial dépose les articles au magasin et initie une déclaration dans **Stock Tontine > Retours**.
2. Le magasinier examine la ligne au statut **En attente**.
3. Après inspection physique des emballages, le magasinier clique sur **« Réceptionner »** pour réintégrer les articles au stock central tontine.



\newpage



---

# Gestion physique du stock commercial (Sorties & Retours)

Le magasinier est l'acteur clé de la délivrance physique des articles aux commerciaux. Aucune marchandise ne doit quitter le magasin sans bon de sortie validé, et aucun retour ne doit être réintégré sans contrôle contradictoire de son état physique.

---

## 1. Servir et livrer une demande de sortie (Menu Stock Commercial > Demandes Sortie)

Toutes les demandes de sortie validées par la gestion arrivent dans le menu **Stock Commercial > Demandes Sortie** (accessible si vous disposez des habilitations requises).

<!-- CAPTURE À INSÉRER : Demande de sortie au statut Validée avec le bouton Livrer visible pour le magasinier. -->

### A. Contrôle avant remise physique
1. Filtrez la liste des demandes par statut ou par commercial pour localiser la commande à préparer.
2. Cliquez sur **« Voir »** pour ouvrir le détail de la demande :
   * Vérifiez la liste exacte des articles et les quantités commandées.
   * Assurez-vous que le statut de la ligne est bien **Validée**.
3. Prélevez les articles en rayon et regroupez-les dans la zone de délivrance.

### B. Remise physique et validation du départ (`Livrer`)
1. Procédez au comptage contradictoire avec le commercial présent au comptoir.
2. Cliquez sur le bouton bleu **« Livrer »**.
3. **Conséquences automatiques** :
   * Le statut de la demande passe définitivement à **Livrée**.
   * Le stock physique du magasin est automatiquement débité.
   * Le stock commercial du destinataire est automatiquement crédité.
   * La date et l'heure précises de livraison sont horodatées.
4. Cliquez sur l'icône de téléchargement pour imprimer la **Fiche de sortie PDF** signée par les deux parties.

> **Consigne absolue.** Ne remettez jamais de marchandise à un commercial sur une demande au statut **Créée / En attente**. Le bouton « Livrer » n'apparaît que sur les demandes expressément validées par la gestion (**Validée**).

---

## 2. Traitement physique des retours d'articles (Menu Stock Commercial > Retours)

Lorsqu'un commercial restitue des articles au dépôt central (invendus de tournée, emballages détériorés, réajustement de dotation), l'opération est traitée dans **Stock Commercial > Retours**.

### A. Réceptionner un retour conforme
1. Le commercial présente les articles au magasin avec son numéro de déclaration de retour.
2. Ouvrez **Stock Commercial > Retours** et identifiez la ligne au statut **En attente**.
3. Vérifiez l'intégrité des produits restitués (état de marche, emballage intact, conformité des références).
4. Si les articles sont conformes, cliquez sur le bouton vert **« Réceptionner »**.
   * Le statut bascule à **Réceptionné**.
   * Le stock central du magasin est réapprovisionné et les articles sont remis en rayon.
   * Le commercial est déchargé de la marchandise.

### B. Refus d'un retour non conforme
* Si un article est détérioré par la faute du commercial ou incomplet, le magasinier ou le gestionnaire clique sur **« Refuser »**.
* Le retour passe au statut **Refusé** : le stock central n'est pas incrémenté et l'article reste sous la responsabilité comptable du commercial jusqu'à règlement du litige.



\newpage



---

