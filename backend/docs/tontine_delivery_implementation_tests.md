# Tests d'implémentation - Gestion des Livraisons de Tontine

## Phase 1 : Backend Implementation

### ✅ Fichiers créés

#### Entités
- [x] `TontineDelivery.java` - Entité principale de livraison
- [x] `TontineDeliveryItem.java` - Entité des articles livrés
- [x] `TontineMember.java` - Modifié pour ajouter la relation OneToOne

#### DTOs
- [x] `CreateDeliveryDto.java` - DTO de création
- [x] `DeliveryItemDto.java` - DTO pour les articles
- [x] `TontineDeliveryDto.java` - DTO de réponse
- [x] `TontineDeliveryItemDto.java` - DTO des articles en réponse

#### Repository
- [x] `TontineDeliveryRepository.java` - Repository avec méthodes personnalisées

#### Service
- [x] `TontineDeliveryService.java` - Logique métier complète

#### Controller
- [x] `TontineDeliveryController.java` - API REST

#### Mapper
- [x] `TontineDeliveryMapper.java` - Mapper MapStruct

#### Migration
- [x] `02_db_migration_tontine_delivery.sql` - Script de création des tables

---

## 🧪 Scénarios de test

### Test 1 : Création d'une livraison normale
**Endpoint:** `POST /api/v1/tontines/deliveries`

**Request:**
```json
{
  "memberId": 1,
  "items": [
    {
      "articleId": 10,
      "quantity": 2
    },
    {
      "articleId": 15,
      "quantity": 1
    }
  ]
}
```

**Conditions préalables:**
- Le membre existe avec `deliveryStatus = "PENDING"`
- Le membre a `totalContribution = 160000`
- Les articles existent avec stock suffisant
- Article 10 : prix = 50000, stock >= 2
- Article 15 : prix = 50000, stock >= 1

**Résultat attendu:**
- Status: 201 CREATED
- Livraison créée avec `totalAmount = 150000`
- `remainingBalance = 10000`
- Statut du membre mis à jour : `DELIVERED`
- Stock des articles déduit
- `commercialUsername` enregistré

---

### Test 2 : Dépassement du montant disponible
**Endpoint:** `POST /api/v1/tontines/deliveries`

**Request:**
```json
{
  "memberId": 1,
  "items": [
    {
      "articleId": 10,
      "quantity": 5
    }
  ]
}
```

**Conditions:**
- Membre avec `totalContribution = 160000`
- Article 10 : prix = 50000
- Total demandé : 250000 > 160000

**Résultat attendu:**
- Status: 400 BAD REQUEST
- Message: "Le montant total (250000.00) dépasse le montant disponible (160000.00)"
- Aucune modification en base de données

---

### Test 3 : Membre déjà livré
**Endpoint:** `POST /api/v1/tontines/deliveries`

**Request:**
```json
{
  "memberId": 1,
  "items": [
    {
      "articleId": 10,
      "quantity": 1
    }
  ]
}
```

**Conditions:**
- Le membre a déjà une livraison (delivery existe)

**Résultat attendu:**
- Status: 400 BAD REQUEST
- Message: "Ce membre a déjà reçu sa livraison"

---

### Test 4 : Article inexistant
**Endpoint:** `POST /api/v1/tontines/deliveries`

**Request:**
```json
{
  "memberId": 1,
  "items": [
    {
      "articleId": 9999,
      "quantity": 1
    }
  ]
}
```

**Résultat attendu:**
- Status: 404 NOT FOUND
- Message: "Article non trouvé avec l'ID: 9999"

---

### Test 5 : Stock insuffisant
**Endpoint:** `POST /api/v1/tontines/deliveries`

**Request:**
```json
{
  "memberId": 1,
  "items": [
    {
      "articleId": 10,
      "quantity": 100
    }
  ]
}
```

**Conditions:**
- Article 10 a seulement 5 en stock

**Résultat attendu:**
- Status: 400 BAD REQUEST
- Message: "Stock insuffisant pour l'article 'Réfrigérateur'. Disponible: 5, Demandé: 100"

---

### Test 6 : Consultation d'une livraison
**Endpoint:** `GET /api/v1/tontines/deliveries/member/1`

**Conditions:**
- Une livraison existe pour le membre 1

**Résultat attendu:**
- Status: 200 OK
- Réponse contient:
  - `id`, `memberId`, `clientName`
  - `deliveryDate`, `totalAmount`, `remainingBalance`
  - `commercialUsername`
  - Liste des `items` avec tous les détails

---

### Test 7 : Consultation d'une livraison inexistante
**Endpoint:** `GET /api/v1/tontines/deliveries/member/999`

**Résultat attendu:**
- Status: 404 NOT FOUND
- Message: "Aucune livraison trouvée pour ce membre"

---

### Test 8 : Validation des données d'entrée
**Endpoint:** `POST /api/v1/tontines/deliveries`

**Request invalide:**
```json
{
  "memberId": null,
  "items": []
}
```

**Résultat attendu:**
- Status: 400 BAD REQUEST
- Messages de validation:
  - "L'identifiant du membre est requis"
  - "La liste des articles ne peut pas être vide"

---

### Test 9 : Quantité invalide
**Request:**
```json
{
  "memberId": 1,
  "items": [
    {
      "articleId": 10,
      "quantity": 0
    }
  ]
}
```

**Résultat attendu:**
- Status: 400 BAD REQUEST
- Message: "La quantité doit être au moins 1"

---

### Test 10 : Membre avec statut invalide
**Conditions:**
- Membre avec `deliveryStatus = "DELIVERED"`

**Résultat attendu:**
- Status: 400 BAD REQUEST
- Message: "Le membre doit avoir le statut PENDING pour recevoir une livraison"

---

## 🔐 Tests de sécurité

### Test 11 : Accès sans authentification
**Endpoint:** `POST /api/v1/tontines/deliveries`

**Résultat attendu:**
- Status: 401 UNAUTHORIZED

---

### Test 12 : Accès sans permission
**Utilisateur:** Role = `ROLE_TONTINE` (lecture seule)

**Résultat attendu:**
- Status: 403 FORBIDDEN

---

### Test 13 : Accès avec permission correcte
**Utilisateur:** Role = `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN`

**Résultat attendu:**
- Status: 201 CREATED (si données valides)

---

## 📊 Tests de performance

### Test 14 : Création avec plusieurs articles
**Request:**
```json
{
  "memberId": 1,
  "items": [
    {"articleId": 1, "quantity": 1},
    {"articleId": 2, "quantity": 2},
    {"articleId": 3, "quantity": 1},
    {"articleId": 4, "quantity": 3},
    {"articleId": 5, "quantity": 1}
  ]
}
```

**Critères:**
- Temps de réponse < 2 secondes
- Toutes les opérations en une seule transaction

---

## 🔄 Tests de transaction

### Test 15 : Rollback en cas d'erreur
**Scénario:**
1. Créer une livraison avec 3 articles
2. Le 3ème article a un stock insuffisant

**Résultat attendu:**
- Aucune livraison créée
- Aucun item créé
- Stock des 2 premiers articles non modifié
- Statut du membre non modifié

---

## 📝 Checklist de validation

### Base de données
- [ ] Tables créées correctement
- [ ] Contraintes de clés étrangères fonctionnelles
- [ ] Index créés pour les performances
- [ ] Contraintes de validation (quantity > 0)

### Logique métier
- [ ] Validation du membre (existe, statut PENDING)
- [ ] Validation des articles (existent, stock suffisant)
- [ ] Calcul correct du total
- [ ] Validation du montant vs disponible
- [ ] Calcul correct du solde restant
- [ ] Mise à jour du statut membre
- [ ] Déduction du stock
- [ ] Enregistrement du commercial

### API
- [ ] Endpoints accessibles
- [ ] Validation des DTOs
- [ ] Gestion des erreurs
- [ ] Codes HTTP corrects
- [ ] Format de réponse cohérent

### Sécurité
- [ ] Authentification requise
- [ ] Permissions vérifiées
- [ ] Pas d'injection SQL possible
- [ ] Validation des entrées

---

## 🚀 Commandes de test avec cURL

### Créer une livraison
```bash
curl -X POST http://localhost:8080/api/v1/tontines/deliveries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "memberId": 1,
    "items": [
      {"articleId": 10, "quantity": 2},
      {"articleId": 15, "quantity": 1}
    ]
  }'
```

### Consulter une livraison
```bash
curl -X GET http://localhost:8080/api/v1/tontines/deliveries/member/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📈 Métriques de succès

- ✅ Tous les tests passent
- ✅ Aucune erreur de compilation
- ✅ Couverture de code > 80%
- ✅ Temps de réponse < 2s
- ✅ Transactions atomiques
- ✅ Gestion d'erreurs complète
