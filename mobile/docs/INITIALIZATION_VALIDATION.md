# Validation de l'initialisation et sécurité de connexion locale

## Vue d'ensemble

Ce document décrit l'implémentation de la sécurité qui empêche les commerciaux de se connecter en mode hors ligne sans avoir effectué une initialisation complète de leurs données pour la journée courante.

## Problème résolu

Les commerciaux partaient parfois sur le terrain sans avoir effectué une initialisation complète de leurs données, ce qui entraînait :
- Des données manquantes ou obsolètes
- Des erreurs de synchronisation
- Une mauvaise expérience utilisateur

## Solution implémentée

### 1. Backend - Endpoint de résumé des données

**Fichier** : `backend/src/main/java/com/optimize/elykia/core/controller/MobileController.java`

**Endpoint** : `GET /api/v1/mobiles/data-summary/{commercialId}`

**Réponse** :
```json
{
  "commercialUsername": "commercial1",
  "generatedAt": "2026-02-15T10:30:00",
  "totalClients": 150,
  "totalDistributions": 45,
  "totalRecoveries": 200,
  "totalTontineMembers": 30,
  "totalTontineCollections": 120,
  "totalTontineDeliveries": 15,
  "totalArticles": 50,
  "totalLocalities": 10,
  "totalStockOutputs": 0,
  "totalAccounts": 0
}
```

**Service** : `CommercialDataSummaryService`
- Utilise des requêtes SQL natives via EntityManager
- Compte les données des 30 derniers jours pour les recouvrements et tontine
- Performance optimisée pour ~200 éléments/jour

### 2. Mobile - Service de validation

**Fichier** : `mobile/src/app/core/services/initialization-validation.service.ts`

**Fonctionnalités** :
- `fetchServerSummary()` : Récupère le résumé depuis le serveur
- `compareData()` : Compare les totaux serveur vs mobile
- `isInitializationCompleteForToday()` : Vérifie si l'initialisation est complète pour aujourd'hui
- `markInitializationComplete()` : Marque l'initialisation comme complète
- `validateInitialization()` : Validation complète (récupération + comparaison)

**Tolérance** : 5% de différence acceptée entre serveur et mobile

### 3. Mobile - Méthodes de comptage

**Fichier** : `mobile/src/app/core/services/database.service.ts`

**Méthodes ajoutées** :
- `countClients(commercialUsername)` : Compte les clients
- `countDistributions(commercialUsername)` : Compte les distributions
- `countRecoveries(commercialUsername, days)` : Compte les recouvrements (N derniers jours)
- `countTontineMembers(commercialUsername)` : Compte les membres de tontine
- `countTontineCollections(commercialUsername, days)` : Compte les collectes
- `countTontineDeliveries(commercialUsername, days)` : Compte les livraisons
- `countArticles()` : Compte les articles
- `countLocalities()` : Compte les localités

### 4. Mobile - Blocage de connexion locale

**Fichier** : `mobile/src/app/core/services/auth.service.ts`

**Modification de `authenticateOffline()`** :
```typescript
// Vérifier si l'initialisation est complète pour aujourd'hui
const isInitComplete = await this.initValidationService.isInitializationCompleteForToday();

if (!isInitComplete) {
  throw new Error(
    'Initialisation incomplète pour aujourd\'hui.\n\n' +
    'Veuillez vous connecter au réseau de l\'entreprise pour initialiser vos données...'
  );
}
```

**Message affiché** :
```
Initialisation incomplète pour aujourd'hui.

Veuillez vous connecter au réseau de l'entreprise pour initialiser vos données avant de travailler en mode hors ligne.

Cela garantit que vous disposez de toutes les informations nécessaires pour votre journée de travail.
```

### 5. Mobile - Validation à la fin de l'initialisation

**Fichier** : `mobile/src/app/features/initial-loading/initial-loading.page.ts`

**Modification de `completeInitialization()`** :
1. Récupère le résumé serveur
2. Compare avec les totaux locaux
3. Si complet : Marque comme complet pour aujourd'hui
4. Si incomplet : Affiche un avertissement mais continue
5. En cas d'erreur : Continue quand même (ne bloque pas l'utilisateur)

**Avertissement affiché** :
```
⚠️ Données incomplètes

Certaines données ne correspondent pas au serveur :

Clients (local: 145, serveur: 150)
Distributions (local: 43, serveur: 45)

Vous pouvez continuer à travailler, mais certaines informations peuvent être manquantes.
```

## Flux de données

### Connexion en ligne (première fois de la journée)

```
1. Login avec credentials
2. Authentification API réussie
3. Navigation vers initial-loading
4. Initialisation de toutes les données
5. Récupération du résumé serveur
6. Comparaison des totaux
7. Si complet : Marquage "initialisation complète pour aujourd'hui"
8. Navigation vers /tabs
```

### Connexion hors ligne (même journée)

```
1. Login avec credentials
2. Backend offline détecté
3. Vérification : initialisation complète pour aujourd'hui ?
   - OUI : Authentification locale réussie → /tabs
   - NON : Erreur avec message clair → Retour au login
```

### Connexion hors ligne (nouvelle journée)

```
1. Login avec credentials
2. Backend offline détecté
3. Vérification : initialisation complète pour aujourd'hui ?
4. NON (car nouvelle journée)
5. Erreur avec message clair → Retour au login
6. L'utilisateur doit se connecter au réseau pour initialiser
```

## Stockage

**Clé Storage** : `last_complete_initialization_date`
**Valeur** : ISO date string (ex: "2026-02-15T10:30:00.000Z")
**Durée de validité** : Jusqu'à minuit du jour courant

## Avantages

1. **Sécurité** : Garantit que les commerciaux ont toutes leurs données
2. **Fiabilité** : Évite les erreurs de synchronisation
3. **Traçabilité** : Logs détaillés de la validation
4. **Flexibilité** : Tolérance de 5% pour les petites différences
5. **UX** : Messages clairs et non-bloquants en cas de problème mineur

## Limitations et améliorations futures

### Limitations actuelles
- Validation basée sur la date uniquement (pas l'heure exacte)
- Tolérance fixe de 5% (non configurable)
- Pas de récupération automatique des données manquantes

### Améliorations suggérées
1. Ajouter un bouton "Forcer l'initialisation" dans les paramètres
2. Permettre une connexion d'urgence en mode lecture seule
3. Afficher un indicateur visuel de la complétude des données
4. Envoyer des notifications push pour rappeler l'initialisation
5. Ajouter un rapport détaillé des données manquantes

## Tests recommandés

### Test 1 : Première connexion de la journée
1. Se connecter en ligne le matin
2. Vérifier que l'initialisation se termine avec succès
3. Vérifier que le marquage "complète pour aujourd'hui" est fait
4. Se déconnecter et se reconnecter en mode hors ligne
5. Vérifier que la connexion locale fonctionne

### Test 2 : Nouvelle journée sans initialisation
1. Modifier manuellement la date de dernière initialisation (hier)
2. Essayer de se connecter en mode hors ligne
3. Vérifier que le message d'erreur s'affiche
4. Se connecter au réseau et initialiser
5. Vérifier que la connexion locale fonctionne ensuite

### Test 3 : Données incomplètes
1. Simuler une initialisation avec données manquantes
2. Vérifier que l'avertissement s'affiche
3. Vérifier que l'utilisateur peut quand même continuer
4. Vérifier que les logs contiennent les détails des données manquantes

### Test 4 : Performance avec 200 éléments/jour
1. Créer un jeu de données avec ~200 éléments par entité
2. Mesurer le temps de validation
3. Vérifier que la validation prend < 5 secondes
4. Vérifier que la mémoire reste stable

## Maintenance

### Logs à surveiller
- `[InitializationValidation] Comparing server vs local data...`
- `[InitializationValidation] ✅ Data is complete and matches server`
- `[InitializationValidation] ⚠️ Data is incomplete:`
- `[AuthService] Offline login blocked: Initialization not complete for today`

### Métriques à suivre
- Taux de validation réussie
- Nombre de blocages de connexion locale
- Temps moyen de validation
- Fréquence des avertissements de données incomplètes

## Dépendances

### Backend
- Spring Boot
- JPA/Hibernate
- EntityManager (pour requêtes SQL natives)

### Mobile
- Angular
- Ionic Storage
- RxJS
- Capacitor SQLite

## Auteur

Implémenté le 15 février 2026
Branch: `feature/enhance-sync`
