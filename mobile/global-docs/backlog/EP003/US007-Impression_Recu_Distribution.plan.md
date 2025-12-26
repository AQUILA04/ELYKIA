# Plan d'Implémentation : US007 - Impression du Reçu de Distribution

**Objectif :** Après une distribution réussie, présenter un modal proposant l'impression d'un reçu. Ce modal vérifiera la disponibilité d'une imprimante et proposera de générer un PDF en fallback si aucune n'est connectée. Le design du reçu sera adapté aux imprimantes thermiques de caisse.

**Statut Actuel :** Bloqué par l'installation de la dépendance d'impression.

---

### **Étape 1 : Installation des Dépendances (Prérequis)**

*   **[ÉCHEC] Plugin d'Impression Capacitor :** Tenter de résoudre le problème d'installation pour le package `@capacitor-community/printer`.
    ```sh
    npm install @capacitor-community/printer
    ```
*   **[SUCCÈS] Librairies de Génération PDF :** `jspdf` et `html2canvas` sont déjà installées.

---

### **Étape 2 : Création d'un Service d'Impression (`printing.service.ts`)**

*   Créer un service centralisé pour gérer la logique d'impression et de PDF.
*   **Méthodes à implémenter :**
    *   `checkPrinterAvailability()`: Pour vérifier si une imprimante est connectée via le plugin Capacitor.
    *   `printReceipt(htmlContent: string)`: Pour envoyer le contenu HTML à l'imprimante.
    *   `generatePdf(htmlContentElement: HTMLElement, fileName: string)`: Pour générer un PDF en utilisant `html2canvas` et `jspdf`.

---

### **Étape 3 : Mise à Jour du Store NgRx (`distribution`)**

*   **State :** Ajouter les propriétés `printerAvailable`, `isPrinting`, `printError` au `DistributionState`.
*   **Actions :** Créer les actions pour gérer le cycle de vie de l'impression : `checkPrinterAvailability`, `printReceipt`, `generatePdfReceipt` et leurs variantes `Success`/`Failure`.
*   **Reducer :** Mettre à jour le `distributionReducer` pour gérer ces nouvelles actions et mettre à jour le state en conséquence.
*   **Effects :** Créer un `DistributionEffects` pour gérer les effets de bord (appels au `PrintingService`).

---

### **Étape 4 : Création du Modal d'Impression (`print-receipt-modal`)**

*   Créer un nouveau composant partagé pour le modal.
*   **Design du Reçu :** Le HTML et le SCSS du modal seront conçus pour un format de reçu de caisse (compact, monochrome, police à espacement fixe).
*   **Logique du Modal :**
    *   Le modal recevra les données de la distribution.
    *   Il dispatchera l'action `checkPrinterAvailability` à son initialisation.
    *   Il s'abonnera au store pour savoir s'il doit afficher le bouton "Imprimer" ou "Générer PDF".
    *   Le clic sur le bouton déclenchera l'action appropriée (`printReceipt` ou `generatePdfReceipt`).

---

### **Étape 5 : Intégration dans la Page de Nouvelle Distribution**

*   Modifier `new-distribution.page.ts`.
*   Injecter le `ModalController`.
*   Dans le `listener` de l'action `createDistributionSuccess`, remplacer le Toast et la navigation directe par l'ouverture du nouveau modal `PrintReceiptComponent`.
*   La navigation vers la liste des distributions se fera après la fermeture du modal d'impression.
