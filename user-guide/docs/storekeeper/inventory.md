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

#### Consulter une entrée
1. Ouvrez **Historique Entrée**.
2. Repérez la ligne dans la liste (référence, date, montant total, statut).
3. Cliquez sur **« Voir »** pour afficher le détail : articles reçus et quantités.

#### Télécharger la fiche d'une entrée
1. Ouvrez le détail de l'entrée.
2. Cliquez sur **« Télécharger PDF »**.
3. Le document reprend la référence, la date, le reçu par, la liste des articles avec leurs quantités, et le montant total.

#### Télécharger le récapitulatif d'une journée
1. Sur **Historique Entrée**, choisissez une **date** dans le filtre.
2. Cliquez sur **« PDF du jour »** (le bouton devient disponible une fois la date sélectionnée).
3. Le fichier regroupe toutes les entrées de ce jour, avec les quantités cumulées par article et le montant total de la journée.

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

