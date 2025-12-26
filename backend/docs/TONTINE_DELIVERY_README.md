# 📦 Gestion des Livraisons de Tontine - Documentation Backend

## 🎯 Vue d'ensemble

Cette implémentation permet aux commerciaux de gérer la livraison des articles aux membres de la tontine en fin d'année (décembre). Le système sélectionne des articles dont la valeur totale correspond au montant épargné par le client.

---

## 🏗️ Architecture

### Structure des packages

```
com.optimize.elykia.core
├── entity/
│   ├── TontineDelivery.java          # Entité principale
│   └── TontineDeliveryItem.java      # Articles livrés
├── dto/
│   ├── CreateDeliveryDto.java        # DTO de création
│   ├── DeliveryItemDto.java          # DTO article
│   ├── TontineDeliveryDto.java       # DTO réponse
│   └── TontineDeliveryItemDto.java   # DTO article réponse
├── repository/
│   └── TontineDeliveryRepository.java
├── service/
│   └── TontineDeliveryService.java
├── controller/
│   └── TontineDeliveryController.java
└── mapper/
    └── TontineDeliveryMapper.java
```

---

## 📊 Modèle de données

### TontineDelivery
```java
- id: Long (PK)
- tontineMember: TontineMember (OneToOne, unique)
- deliveryDate: LocalDateTime
- totalAmount: Double
- remainingBalance: Double
- commercialUsername: String
- items: List<TontineDeliveryItem> (OneToMany)
```

### TontineDeliveryItem
```java
- id: Long (PK)
- delivery: TontineDelivery (ManyToOne)
- articleId: Long
- articleName: String
- articleCode: String
- quantity: Integer
- unitPrice: Double
- totalPrice: Double
```

---

## 🔌 API Endpoints

### 1. Créer une livraison

**POST** `/api/v1/tontines/deliveries`

**Permissions:** `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN`

**Request Body:**
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

**Response (201 CREATED):**
```json
{
  "status": "success",
  "statusCode": 201,
  "message": "Livraison créée avec succès",
  "service": "optimize-elykia-core",
  "data": {
    "id": 1,
    "memberId": 1,
    "clientName": "Jean Dupont",
    "deliveryDate": "2025-12-15T10:30:00",
    "totalAmount": 150000.0,
    "remainingBalance": 10000.0,
    "commercialUsername": "commercial1",
    "items": [
      {
        "id": 1,
        "articleId": 10,
        "articleName": "Réfrigérateur",
        "articleCode": "ELEC-Samsung",
        "quantity": 2,
        "unitPrice": 50000.0,
        "totalPrice": 100000.0
      },
      {
        "id": 2,
        "articleId": 15,
        "articleName": "Télévision",
        "articleCode": "ELEC-LG",
        "quantity": 1,
        "unitPrice": 50000.0,
        "totalPrice": 50000.0
      }
    ]
  }
}
```

---

### 2. Consulter une livraison

**GET** `/api/v1/tontines/deliveries/member/{memberId}`

**Permissions:** `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN`

**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Opération réussie",
  "service": "optimize-elykia-core",
  "data": {
    "id": 1,
    "memberId": 1,
    "clientName": "Jean Dupont",
    "deliveryDate": "2025-12-15T10:30:00",
    "totalAmount": 150000.0,
    "remainingBalance": 10000.0,
    "commercialUsername": "commercial1",
    "items": [...]
  }
}
```

---

## ⚙️ Logique métier

### Processus de création d'une livraison

```
1. Validation du membre
   ├─ Vérifier que le membre existe
   ├─ Vérifier le statut = "PENDING"
   └─ Vérifier totalContribution > 0

2. Vérification de l'unicité
   └─ Vérifier qu'aucune livraison n'existe déjà

3. Validation des articles
   ├─ Pour chaque article:
   │  ├─ Vérifier que l'article existe
   │  ├─ Vérifier le stock disponible
   │  └─ Créer TontineDeliveryItem
   └─ Calculer les prix (unitPrice × quantity)

4. Validation du montant
   ├─ Calculer totalAmount = Σ(item.totalPrice)
   └─ Vérifier totalAmount ≤ member.totalContribution

5. Calcul du solde
   └─ remainingBalance = totalContribution - totalAmount

6. Création de la livraison
   ├─ Créer TontineDelivery
   ├─ Associer les items
   └─ Enregistrer commercialUsername

7. Mise à jour du membre
   └─ deliveryStatus = "DELIVERED"

8. Mise à jour du stock
   └─ Pour chaque article: stock -= quantity

9. Sauvegarde transactionnelle
   └─ Tout ou rien (rollback si erreur)
```

---

## ✅ Validations

### Validation du membre
- ✅ Le membre doit exister
- ✅ Le statut doit être "PENDING"
- ✅ Le totalContribution doit être > 0
- ✅ Aucune livraison ne doit déjà exister

### Validation des articles
- ✅ Tous les articles doivent exister
- ✅ Le stock doit être suffisant pour chaque article
- ✅ Les quantités doivent être > 0

### Validation du montant
- ✅ Le total ne doit pas dépasser le montant épargné
- ✅ Les calculs doivent être précis (Double precision)

---

## 🔒 Sécurité

### Permissions

| Action | Permissions requises |
|--------|---------------------|
| Créer une livraison | `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN` |
| Consulter une livraison | `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN` |

### Audit
- Chaque livraison enregistre le `commercialUsername`
- Utilisation de `BaseEntity` pour l'audit trail (createdBy, createdDate, etc.)

---

## 🗄️ Base de données

### Migration SQL

Exécuter le script : `src/main/resources/02_db_migration_tontine_delivery.sql`

**Tables créées:**
- `tontine_delivery`
- `tontine_delivery_item`

**Index créés:**
- `idx_tontine_delivery_member_id`
- `idx_tontine_delivery_date`
- `idx_tontine_delivery_commercial`
- `idx_tontine_delivery_item_delivery_id`
- `idx_tontine_delivery_item_article_id`

---

## 🚨 Gestion des erreurs

### Exceptions personnalisées

| Exception | Code HTTP | Cas d'usage |
|-----------|-----------|-------------|
| `ResourceNotFoundException` | 404 | Membre ou article non trouvé |
| `CustomValidationException` | 400 | Validation métier échouée |

### Messages d'erreur

```java
// Membre non trouvé
"Membre non trouvé"

// Membre déjà livré
"Ce membre a déjà reçu sa livraison"

// Statut invalide
"Le membre doit avoir le statut PENDING pour recevoir une livraison"

// Montant dépassé
"Le montant total (X) dépasse le montant disponible (Y)"

// Article non trouvé
"Article non trouvé avec l'ID: X"

// Stock insuffisant
"Stock insuffisant pour l'article 'X'. Disponible: Y, Demandé: Z"
```

---

## 🧪 Tests

### Tests unitaires recommandés

```java
@Test
void createDelivery_Success() {
    // Test création normale
}

@Test
void createDelivery_MemberNotFound() {
    // Test membre inexistant
}

@Test
void createDelivery_AlreadyDelivered() {
    // Test membre déjà livré
}

@Test
void createDelivery_AmountExceeded() {
    // Test dépassement montant
}

@Test
void createDelivery_InsufficientStock() {
    // Test stock insuffisant
}

@Test
void getDeliveryByMemberId_Success() {
    // Test consultation
}

@Test
void getDeliveryByMemberId_NotFound() {
    // Test livraison inexistante
}
```

Voir `docs/tontine_delivery_implementation_tests.md` pour les scénarios détaillés.

---

## 📝 Utilisation

### Exemple avec Java

```java
@Autowired
private TontineDeliveryService deliveryService;

// Créer une livraison
CreateDeliveryDto dto = new CreateDeliveryDto();
dto.setMemberId(1L);

List<DeliveryItemDto> items = new ArrayList<>();
DeliveryItemDto item1 = new DeliveryItemDto();
item1.setArticleId(10L);
item1.setQuantity(2);
items.add(item1);

dto.setItems(items);

TontineDeliveryDto delivery = deliveryService.createDelivery(dto);

// Consulter une livraison
TontineDeliveryDto delivery = deliveryService.getDeliveryByMemberId(1L);
```

---

## 🔄 Intégration avec le frontend

### Flux utilisateur

1. Commercial accède aux détails du membre
2. Clique sur "Préparer la Livraison"
3. Recherche et sélectionne des articles
4. Système calcule le total en temps réel
5. Valide la livraison
6. Système crée la livraison et met à jour le statut

### Endpoints à appeler

```typescript
// 1. Récupérer les articles disponibles
GET /api/v1/articles

// 2. Créer la livraison
POST /api/v1/tontines/deliveries

// 3. Consulter la livraison
GET /api/v1/tontines/deliveries/member/{memberId}
```

---

## 📈 Améliorations futures

- [ ] Export PDF du reçu de livraison
- [ ] Signature électronique du client
- [ ] Photos des articles livrés
- [ ] Livraisons partielles (plusieurs livraisons par membre)
- [ ] Gestion des retours/échanges
- [ ] Statistiques sur les articles les plus demandés
- [ ] Notification automatique au client

---

## 🐛 Dépannage

### Problème : "Ce membre a déjà reçu sa livraison"
**Solution:** Vérifier le statut du membre et l'existence d'une livraison

### Problème : "Stock insuffisant"
**Solution:** Vérifier le stock disponible dans la table `articles`

### Problème : "Le montant total dépasse le montant disponible"
**Solution:** Réduire les quantités ou choisir des articles moins chers

### Problème : Transaction rollback
**Solution:** Vérifier les logs pour identifier l'erreur exacte

---

## 📞 Support

Pour toute question ou problème :
- Consulter les logs : `logs/application.log`
- Vérifier les tests : `docs/tontine_delivery_implementation_tests.md`
- Consulter la spec : `docs/tontine_delivery_management_spec.md`

---

## ✨ Changelog

Voir `changelog.md` pour l'historique complet des modifications.
