# 📊 Consultation des Sessions Historiques - Documentation Backend

## 🎯 Vue d'ensemble

Cette implémentation permet aux gestionnaires et commerciaux de consulter les données des sessions de tontine des années précédentes pour analyse, reporting et référence historique. Les données historiques sont en **lecture seule**.

---

## 🏗️ Architecture

### Structure des packages

```
com.optimize.elykia.core
├── dto/
│   ├── TontineSessionDto.java           # DTO session
│   ├── SessionStatsDto.java             # DTO statistiques
│   ├── SessionSummaryDto.java           # DTO résumé
│   ├── SessionComparisonDto.java        # DTO comparaison
│   ├── ComparisonMetricsDto.java        # DTO métriques
│   ├── TopCommercialDto.java            # DTO top commercial
│   └── CompareSessionsRequestDto.java   # DTO requête
├── service/
│   └── TontineSessionService.java
└── controller/
    └── TontineSessionController.java
```

---

## 📊 Modèle de données

### TontineSessionDto
```java
- id: Long
- year: Integer
- startDate: LocalDate
- endDate: LocalDate
- status: String (ACTIVE, CLOSED)
- memberCount: Integer
- totalCollected: Double
```

### SessionStatsDto
```java
- sessionId: Long
- year: Integer
- totalMembers: Integer
- totalCollected: Double
- averageContribution: Double
- deliveredCount: Integer
- pendingCount: Integer
- deliveryRate: Double
- topCommercials: List<TopCommercialDto>
```

### SessionComparisonDto
```java
- sessions: List<SessionSummaryDto>
- comparisonMetrics: ComparisonMetricsDto
```

---

## 🔌 API Endpoints

### 1. Lister toutes les sessions

**GET** `/api/v1/tontines/sessions`

**Permissions:** `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN`

**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Opération réussie",
  "service": "optimize-elykia-core",
  "data": [
    {
      "id": 3,
      "year": 2025,
      "startDate": "2025-01-15",
      "endDate": "2025-11-30",
      "status": "ACTIVE",
      "memberCount": 200,
      "totalCollected": 15000000.0
    },
    {
      "id": 2,
      "year": 2024,
      "startDate": "2024-01-15",
      "endDate": "2024-11-30",
      "status": "CLOSED",
      "memberCount": 180,
      "totalCollected": 32000000.0
    },
    {
      "id": 1,
      "year": 2023,
      "startDate": "2023-01-15",
      "endDate": "2023-11-30",
      "status": "CLOSED",
      "memberCount": 150,
      "totalCollected": 25000000.0
    }
  ]
}
```

---

### 2. Obtenir les détails d'une session

**GET** `/api/v1/tontines/sessions/{sessionId}`

**Permissions:** `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN`

**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "id": 1,
    "year": 2023,
    "startDate": "2023-01-15",
    "endDate": "2023-11-30",
    "status": "CLOSED",
    "memberCount": 150,
    "totalCollected": 25000000.0
  }
}
```

---

### 3. Obtenir les membres d'une session

**GET** `/api/v1/tontines/sessions/{sessionId}/members`

**Query Parameters:**
- `page` : Numéro de page (défaut: 0)
- `size` : Taille de page (défaut: 20)
- `sort` : Champ de tri (défaut: id,desc)

**Permissions:** `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN`

**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "content": [
      {
        "id": 1,
        "client": {
          "id": 10,
          "fullName": "Jean Dupont",
          "collector": "commercial1"
        },
        "totalContribution": 160000.0,
        "deliveryStatus": "DELIVERED",
        "registrationDate": "2023-01-20T10:00:00"
      }
    ],
    "totalElements": 150,
    "totalPages": 8,
    "size": 20,
    "number": 0
  }
}
```

---

### 4. Obtenir les statistiques d'une session

**GET** `/api/v1/tontines/sessions/{sessionId}/stats`

**Permissions:** `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN`

**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "sessionId": 1,
    "year": 2023,
    "totalMembers": 150,
    "totalCollected": 25000000.0,
    "averageContribution": 166666.67,
    "deliveredCount": 145,
    "pendingCount": 5,
    "deliveryRate": 96.67,
    "topCommercials": [
      {
        "username": "commercial1",
        "memberCount": 45,
        "totalCollected": 8000000.0
      },
      {
        "username": "commercial2",
        "memberCount": 38,
        "totalCollected": 6500000.0
      },
      {
        "username": "commercial3",
        "memberCount": 35,
        "totalCollected": 5800000.0
      }
    ]
  }
}
```

---

### 5. Comparer plusieurs sessions

**POST** `/api/v1/tontines/sessions/compare`

**Permissions:** `ROLE_REPORT` ou `ROLE_ADMIN`

**Request Body:**
```json
{
  "years": [2023, 2024, 2025]
}
```

**Validation:**
- Minimum 2 années
- Maximum 5 années

**Response (200 OK):**
```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "sessions": [
      {
        "year": 2023,
        "totalMembers": 150,
        "totalCollected": 25000000.0,
        "averageContribution": 166666.67,
        "deliveryRate": 96.67,
        "topCommercial": "commercial1"
      },
      {
        "year": 2024,
        "totalMembers": 180,
        "totalCollected": 32000000.0,
        "averageContribution": 177777.78,
        "deliveryRate": 98.33,
        "topCommercial": "commercial2"
      },
      {
        "year": 2025,
        "totalMembers": 200,
        "totalCollected": 15000000.0,
        "averageContribution": 75000.0,
        "deliveryRate": 0.0,
        "topCommercial": "commercial1"
      }
    ],
    "comparisonMetrics": {
      "memberGrowth": 33.33,
      "collectionGrowth": -40.0,
      "bestYear": 2024,
      "worstYear": 2025
    }
  }
}
```

---

## ⚙️ Logique métier

### Calcul des statistiques

```java
// Taux de livraison
deliveryRate = (deliveredCount / totalMembers) × 100

// Contribution moyenne
averageContribution = totalCollected / totalMembers

// Croissance des membres
memberGrowth = ((lastYear.members - firstYear.members) / firstYear.members) × 100

// Croissance des collectes
collectionGrowth = ((lastYear.collected - firstYear.collected) / firstYear.collected) × 100
```

### Top commerciaux

Les commerciaux sont classés par :
1. Montant total collecté (décroissant)
2. Limité aux 5 premiers

---

## 🔒 Sécurité

### Permissions

| Action | Permissions requises |
|--------|---------------------|
| Lister les sessions | `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN` |
| Détails d'une session | `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN` |
| Membres d'une session | `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN` |
| Statistiques | `ROLE_TONTINE`, `ROLE_EDIT_TONTINE` ou `ROLE_ADMIN` |
| Comparaison | `ROLE_REPORT` ou `ROLE_ADMIN` |

### Règles de visibilité
- Commercial : Voit uniquement ses clients (toutes années)
- Gestionnaire : Voit tous les clients (toutes années)

---

## 🚨 Gestion des erreurs

### Exceptions

| Exception | Code HTTP | Cas d'usage |
|-----------|-----------|-------------|
| `ResourceNotFoundException` | 404 | Session non trouvée |
| `CustomValidationException` | 400 | Validation échouée (ex: moins de 2 années) |

### Messages d'erreur

```java
// Session non trouvée
"Session non trouvée"

// Validation de comparaison
"Vous devez sélectionner entre 2 et 5 années"
"La liste des années ne peut pas être vide"
```

---

## 📈 Métriques calculées

### Par session
- **Nombre total de membres**
- **Montant total collecté**
- **Contribution moyenne**
- **Nombre de membres livrés**
- **Nombre de membres en attente**
- **Taux de livraison (%)**
- **Top 5 commerciaux**

### Comparaison
- **Croissance des membres (%)**
- **Croissance des collectes (%)**
- **Meilleure année** (basée sur le montant collecté)
- **Pire année** (basée sur le montant collecté)

---

## 🧪 Tests

### Scénarios de test

#### Test 1 : Lister toutes les sessions
```bash
curl -X GET http://localhost:8080/api/v1/tontines/sessions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:**
- Liste de toutes les sessions
- Triées par année (décroissante)
- Avec memberCount et totalCollected

---

#### Test 2 : Statistiques d'une session
```bash
curl -X GET http://localhost:8080/api/v1/tontines/sessions/1/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:**
- Statistiques complètes
- Top 5 commerciaux
- Tous les calculs corrects

---

#### Test 3 : Comparer 3 sessions
```bash
curl -X POST http://localhost:8080/api/v1/tontines/sessions/compare \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"years": [2023, 2024, 2025]}'
```

**Résultat attendu:**
- Résumé de chaque session
- Métriques de comparaison
- Identification best/worst year

---

#### Test 4 : Comparaison avec moins de 2 années
```bash
curl -X POST http://localhost:8080/api/v1/tontines/sessions/compare \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"years": [2023]}'
```

**Résultat attendu:**
- Status: 400 BAD REQUEST
- Message: "Vous devez sélectionner entre 2 et 5 années"

---

## 📊 Cas d'usage

### Cas 1 : Dashboard avec sélecteur d'année

```typescript
// Frontend - Charger les sessions disponibles
const sessions = await fetch('/api/v1/tontines/sessions');

// Afficher dans un dropdown
<select onChange={handleYearChange}>
  {sessions.map(s => (
    <option value={s.id}>{s.year} - {s.status}</option>
  ))}
</select>

// Charger les membres de la session sélectionnée
const members = await fetch(`/api/v1/tontines/sessions/${sessionId}/members`);
```

---

### Cas 2 : Page de statistiques

```typescript
// Charger les stats d'une session
const stats = await fetch(`/api/v1/tontines/sessions/${sessionId}/stats`);

// Afficher les KPIs
<div>
  <KPI label="Membres" value={stats.totalMembers} />
  <KPI label="Collecté" value={stats.totalCollected} />
  <KPI label="Taux livraison" value={stats.deliveryRate + '%'} />
</div>

// Afficher le top commerciaux
<TopCommercialsList data={stats.topCommercials} />
```

---

### Cas 3 : Page de comparaison

```typescript
// Comparer plusieurs années
const comparison = await fetch('/api/v1/tontines/sessions/compare', {
  method: 'POST',
  body: JSON.stringify({ years: [2023, 2024, 2025] })
});

// Afficher le tableau comparatif
<ComparisonTable sessions={comparison.sessions} />

// Afficher les métriques
<MetricsCard metrics={comparison.comparisonMetrics} />
```

---

## 🔄 Intégration avec le frontend

### Flux utilisateur

1. **Sélection de session**
   - Utilisateur accède au dashboard
   - Sélectionne une année dans le dropdown
   - Système charge les données de cette session

2. **Consultation des statistiques**
   - Utilisateur clique sur "Statistiques"
   - Système affiche les KPIs
   - Affiche les top commerciaux

3. **Comparaison de sessions**
   - Utilisateur accède à la page de comparaison
   - Sélectionne 2-5 années
   - Système affiche le tableau et les graphiques

---

## 📝 Utilisation

### Exemple avec Java

```java
@Autowired
private TontineSessionService sessionService;

// Lister toutes les sessions
List<TontineSessionDto> sessions = sessionService.getAllSessions();

// Obtenir les statistiques
SessionStatsDto stats = sessionService.getSessionStats(1L);

// Comparer des sessions
List<Integer> years = Arrays.asList(2023, 2024, 2025);
SessionComparisonDto comparison = sessionService.compareSessions(years);
```

---

## 🎯 Points clés

### ✅ Avantages
- **Lecture seule** : Aucune modification possible sur les données historiques
- **Performance** : Calculs optimisés avec Stream API
- **Flexibilité** : Comparaison de 2 à 5 années
- **Complet** : Toutes les métriques importantes calculées
- **Sécurisé** : Permissions granulaires

### ⚠️ Limitations
- Pas de cache (calculs à chaque requête)
- Comparaison limitée à 5 années
- Pas d'export dans cette phase (Phase 3)

---

## 📈 Améliorations futures (Phase 3)

- [ ] Export Excel des statistiques
- [ ] Export PDF des rapports
- [ ] Cache des statistiques
- [ ] Graphiques générés côté backend
- [ ] Prédictions basées sur l'historique
- [ ] Notifications de clôture de session

---

## 📞 Support

Pour toute question :
- Consulter les logs : `logs/application.log`
- Vérifier la spec : `docs/tontine_historical_sessions_spec.md`
- Consulter le changelog : `changelog.md`

---

## ✨ Résumé

La **Phase 2** fournit une API complète pour consulter et analyser les sessions historiques de tontine, avec des statistiques détaillées et des fonctionnalités de comparaison.

**Prêt pour** : Intégration frontend et Phase 3 (Export)
