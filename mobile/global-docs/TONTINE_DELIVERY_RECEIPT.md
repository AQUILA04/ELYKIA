# Reçu de Livraison Tontine

## Fonctionnalité Ajoutée

Après l'enregistrement d'une livraison de tontine, un modal de reçu s'affiche automatiquement avec un aperçu du reçu et la possibilité de l'imprimer sur une imprimante thermique 48mm.

## Fichiers Créés

### 1. Composant Modal
- `elykia-mobile/src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.component.ts`
- `elykia-mobile/src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.component.html`
- `elykia-mobile/src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.component.scss`
- `elykia-mobile/src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.module.ts`

### 2. Interface et Service d'Impression
**Fichier modifié**: `elykia-mobile/src/app/core/services/printing.service.ts`

- Ajout de l'interface `PrintableTontineDelivery`
- Ajout de la méthode `printTontineDeliveryReceipt()`
- Ajout de la méthode privée `generateTontineDeliveryReceiptHTML()`

### 3. Intégration dans la Page de Création de Livraison
**Fichiers modifiés**:
- `elykia-mobile/src/app/features/tontine/pages/delivery-creation/delivery-creation.page.ts`
- `elykia-mobile/src/app/features/tontine/pages/delivery-creation/delivery-creation.module.ts`

## Contenu du Reçu

Le reçu de livraison contient les informations suivantes :

### En-tête
- Logo et titre "REÇU DE LIVRAISON"
- Sous-titre "Tontine - Fin d'Année"
- Numéro de livraison unique (format: LIV-YYYY-XXXXX)

### Informations Bénéficiaire
- Nom complet du client
- Numéro de téléphone

### Informations de Livraison
- Date de demande
- Date de livraison (si disponible)
- Nom du commercial
- Session (année)

### Articles Livrés
Pour chaque article :
- Nom de l'article
- Quantité
- Prix unitaire
- Prix total

### Résumé Budgétaire
- Total épargné par le membre
- Total de la livraison
- Montant restant

### Valeur Totale
- Montant total de la livraison en grand format

### Pied de page
- Zones de signature (Commercial et Bénéficiaire)
- Message de remerciement
- Identifiant unique

## Format d'Impression Thermique

Le reçu est optimisé pour une imprimante thermique avec papier de **48mm** :

### Caractéristiques
- Largeur: 56mm (pour éviter les coupures)
- Police: Arial, 8px
- Marges: 1mm
- Séparateurs: Lignes pointillées
- Mise en page: Une colonne, responsive

### Sections Visuelles
- **En-tête**: Centré, police 9px, gras
- **Informations**: Lignes avec label à gauche, valeur à droite
- **Articles**: Cartes avec bordure gauche colorée
- **Budget**: Fond gris clair avec lignes séparées
- **Total**: Encadré avec bordure épaisse, police 12px

## Flux Utilisateur

1. **Création de livraison** → L'utilisateur sélectionne les articles et valide
2. **Enregistrement** → La livraison est sauvegardée dans la base de données locale
3. **Affichage du reçu** → Le modal s'ouvre automatiquement avec l'aperçu
4. **Actions disponibles**:
   - **Imprimer** : Envoie le reçu à l'imprimante thermique
   - **Fermer** : Ferme le modal
5. **Navigation** → Après fermeture du modal, redirection vers le dashboard de tontine

## Données du Reçu

```typescript
interface PrintableTontineDelivery {
  delivery: {
    id: string;
    requestDate: string;
    deliveryDate?: string;
    totalAmount: number;
  };
  items: Array<{
    articleName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  client: {
    fullName?: string;
    phone?: string;
  };
  session: {
    year: number;
  };
  commercial: {
    name: string;
  };
  totalBudget: number;
  remainingBudget: number;
}
```

## Exemple de Reçu Imprimé

```
    AMENOUVEVE-YAVEH
    RECU DE LIVRAISON
    TONTINE FIN D'ANNEE
      Session 2025

---------------------------

Date livraison: 01/12/2025

BENEFICIAIRE:
Test Tontine
90000102

Commercial: COM001

---------------------------

    ARTICLES LIVRES

[Article 1]           x2
1000 FCFA/u    2000 FCFA

[Article 2]           x1
500 FCFA/u      500 FCFA

---------------------------

Total Epargne:  5000 FCFA
Total Livraison: 2500 FCFA
Restant:        2500 FCFA

┌─────────────────────────┐
│    VALEUR TOTALE        │
│    2500 FCFA            │
└─────────────────────────┘

---------------------------

Merci pour votre confiance!
Bonne fin d'annee!

#LIV123456
```

## Bénéfices

- ✅ Traçabilité complète des livraisons
- ✅ Preuve de livraison pour le client
- ✅ Impression thermique optimisée 48mm
- ✅ Design professionnel et lisible
- ✅ Informations complètes (articles, budget, signatures)
- ✅ Identifiant unique pour chaque reçu
- ✅ Expérience utilisateur fluide
- ✅ Cohérence avec le reçu de collecte
