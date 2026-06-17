# Spécifications Techniques et Fonctionnelles — Espace Client ELYKIA v1.0

**Auteur :** Francis AHONSU  
**Date :** Juin 2026  
**Version :** 1.0.0

## Vue d'Ensemble

L'Espace Client ELYKIA est une application Angular/Ionic indépendante, compilée pour Android (Capacitor) et Web depuis un code base unique. Elle permet aux clients finaux de gérer leurs achats à crédit, d'effectuer des paiements via Mobile Money, et de passer de nouvelles commandes — le tout de manière autonome, sans passer par l'agence pour les opérations courantes.

## Parcours Utilisateurs

| Écran | Route | Description |
|---|---|---|
| S-01/02 | `/auth` | Connexion via numéro de téléphone + code PIN |
| S-03 | `/dashboard` | Tableau de bord : crédit en cours, actions rapides, activités |
| S-04 | `/purchases` | Historique de tous les achats à crédit |
| S-05 | `/purchases/:id` | Détail d'un achat : articles, montants, statut |
| S-06 | `/purchases/:id/timeline` | Timeline des mises : pastilles 1-31 + liste verticale |
| S-07/08 | `/payment/:id` | Paiement Mobile Money manuel (formulaire + confirmation) |
| S-09 | `/catalog` | Catalogue produits avec recherche |
| S-10 | `/cart` | Panier avec résumé financier |
| S-11 | `/order-confirmation` | Confirmation de commande soumise |

## Règles Métier Clés

### Paiement Mobile Money (v1 Manuelle)
Le client effectue d'abord son transfert Mobile Money vers le numéro de l'agence, puis saisit dans l'application : le numéro d'envoi, le montant envoyé, et la référence du transfert. Le recouvrement est créé à l'état `INITIÉ`. Un agent de l'agence doit ensuite valider manuellement depuis le back-office pour que le paiement soit comptabilisé comme effectif.

### Nouvelle Commande
Le client sélectionne les articles depuis le catalogue et soumet sa commande. Celle-ci est créée à l'état `INITIÉ`. L'agence valide la commande (`VALIDÉ`), puis procède à la livraison (`LIVRÉ`). Le crédit ne démarre qu'à partir de la date de livraison.

### Pastilles de Recouvrement (S-06)
La grille affiche de 1 à 31 pastilles numérotées selon le nombre d'échéances du crédit. Chaque pastille reflète le statut de la mise correspondante :

| Couleur | Statut | Condition |
|---|---|---|
| Vert `#22C55E` | VALIDÉ | Mise confirmée par l'agence |
| Orange `#F97316` | INITIÉ | Mise soumise, en attente de validation |
| Rouge `#EF4444` | RETARD | Mise non payée à l'échéance |
| Gris `#D1D5DB` | RESTANT | Échéance future |

## Design System

### Palette de Couleurs
- Primaire : Navy `#0D1B2A`, Navy Mid `#1A2E42`
- Accent : Gold `#C9922A`, Gold Light `#F0C66A`
- Fond : Cream `#FAF6EE`, White `#FFFFFF`, Gray BG `#F1F4F8`
- Statuts : Vert `#22C55E`, Orange `#F97316`, Rouge `#EF4444`, Bleu `#60A5FA`, Gris `#D1D5DB`

### Typographie
- Titres : **Playfair Display** (700)
- Corps : **DM Sans** (300, 400, 500, 600)

### Composants
- Cartes : fond blanc, `border-radius: 16px`, `box-shadow: 0 2px 12px rgba(13,27,42,0.08)`
- Boutons : `border-radius: 12px`, fond Gold `#C9922A`
- Inputs : fond `#F1F4F8`, `border-radius: 10px`

## Architecture Technique

### Stack
- **Framework :** Angular 20 + Ionic 8
- **Mobile :** Capacitor 8 (Android + iOS)
- **Web :** PWA via `ionic build`
- **State :** Services RxJS (NgRx prévu pour v2)

### Sécurité
- Authentification JWT dédiée au rôle client (distinct du token commercial)
- Intercepteur HTTP `CustomerAuthInterceptor` pour injection automatique du Bearer token
- Guard `CustomerAuthGuard` sur toutes les routes protégées
- Session stockée en `localStorage` avec vérification d'expiration

### Endpoints Backend Requis
Tous préfixés par `/api/customer/` avec rôle `ROLE_CLIENT`.

| Méthode | Endpoint | Statut |
|---|---|---|
| POST | `/api/customer/auth/login` | À implémenter |
| GET | `/api/customer/dashboard` | À implémenter |
| GET | `/api/customer/purchases` | À implémenter |
| GET | `/api/customer/purchases/:id` | À implémenter |
| GET | `/api/customer/purchases/:id/recoveries` | À implémenter |
| POST | `/api/customer/recoveries/mobile-money` | À implémenter |
| GET | `/api/customer/articles` | À implémenter |
| POST | `/api/customer/orders` | À implémenter |

## Prochaines Étapes

1. Validation des wireflows par le Product Owner
2. Développement des templates HTML complets (dashboard, catalog, cart)
3. Implémentation des endpoints backend `/api/customer/*`
4. Intégration NgRx pour la gestion du panier
5. Tests E2E Playwright sur les 5 parcours
6. Build Android et tests sur device physique
