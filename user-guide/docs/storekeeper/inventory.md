# Inventaires et entrées de stock (Guide Magasinier)

Le magasinier est le garant de la sécurité physique des marchandises stockées dans le dépôt principal. Il supervise les entrées de nouveaux articles livrés par les fournisseurs et participe activement aux opérations d'inventaire physique.

---

## 1. Réceptionner des marchandises et créer une entrée (`/inventory/list`)

Toute marchandise déchargée au dépôt doit être immédiatement enregistrée dans le système pour amorcer le processus de contrôle.

<!-- CAPTURE À INSÉRER : Formulaire Entrées stock avec sélection des articles, quantités reçues et bouton de validation. -->

### A. Procédure d'enregistrement d'une entrée
1. Ouvrez le menu **Inventaires** et cliquez sur le bouton bleu **« Entrées stock »** (`data-testid="e2e-inventory-add-stock"`).
2. Sélectionnez l'article reçu dans la liste déroulante.
3. Saisissez la quantité physique constatée sur le bordereau du transporteur ou du fournisseur.
4. Répétez l'opération pour chaque ligne du bon de livraison.
5. Cliquez sur **« Valider l'entrée »**.

### B. Suivi dans l'Historique des Entrées (`/stock/receptions`)
* Dès la validation de la saisie, l'application génère une référence unique de réception (ex: `REC-2026-0042`) avec le statut initial **`PENDING` (En attente)**.
* **Consigne de sécurité stricte** : Une entrée en attente **n'augmente pas encore le stock disponible**. Vous ne devez jamais servir une demande de sortie sur la base d'une entrée non encore validée par le gestionnaire.
* Dès que le gestionnaire valide la réception dans son interface, le statut passe à **`VALIDATED`** et la marchandise devient officiellement disponible pour les sorties.

---

## 2. Réalisation d'un inventaire physique magasin

L'inventaire physique permet de vérifier que le stock réel en rayon correspond rigoureusement aux quantités enregistrées en base de données.

<!-- CAPTURE À INSÉRER : Écran de session d'inventaire avec statut IN_PROGRESS, téléchargement PDF et saisie des quantités physiques. -->

### A. Les 4 étapes de l'inventaire pour le magasinier

```mermaid
graph TD
    A["1. Téléchargement du Support PDF<br/>(Feuille de comptage vierge)"] --> B["2. Comptage Physique en Rayon<br/>(Dénombrement manuel par carton/unité)"]
    B --> C["3. Saisie des Quantités Physiques<br/>(Bouton Saisir quantités physiques)"]
    C --> D["4. Examen des Écarts avec la Gestion<br/>(Surplus ou Manquants)"]
```

1. **Étape 1 : Téléchargement du support de comptage** :
   * Lorsqu'une session est ouverte (`IN_PROGRESS`), cliquez sur **« Télécharger PDF »**.
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

