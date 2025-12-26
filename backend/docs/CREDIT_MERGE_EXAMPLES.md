# Exemples d'utilisation de l'API de Fusion des Crédits

## 1. Récupérer les crédits fusionnables

### Requête cURL
```bash
curl -X GET "http://localhost:8080/api/v1/credits/mergeable/commercial123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Réponse attendue
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": [
    {
      "id": 1,
      "reference": "P24123456",
      "beginDate": "2024-01-15",
      "totalAmount": 150000.0
    },
    {
      "id": 2,
      "reference": "P24789012",
      "beginDate": "2024-01-20",
      "totalAmount": 200000.0
    },
    {
      "id": 3,
      "reference": "P24345678",
      "beginDate": "2024-01-10",
      "totalAmount": 100000.0
    }
  ]
}
```

## 2. Fusionner des crédits sélectionnés

### Requête cURL
```bash
curl -X POST "http://localhost:8080/api/v1/credits/merge" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "creditIds": [1, 2, 3],
    "commercialUsername": "commercial123"
  }'
```

### Réponse attendue
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": "FP24345678901234"
}
```

## 3. Scénario complet d'utilisation

### Étape 1: Authentification
```bash
# Connexion pour obtenir le token JWT
curl -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "commercial123",
    "password": "password123"
  }'
```

### Étape 2: Récupération des crédits fusionnables
```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "http://localhost:8080/api/v1/credits/mergeable/commercial123" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Étape 3: Sélection et fusion
```bash
curl -X POST "http://localhost:8080/api/v1/credits/merge" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "creditIds": [1, 2, 3],
    "commercialUsername": "commercial123"
  }'
```

### Étape 4: Vérification du résultat
```bash
# Récupérer le crédit fusionné avec la nouvelle référence
curl -X GET "http://localhost:8080/api/v1/credits?search=FP24345678901234" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 4. Gestion des erreurs

### Erreur: Crédits non trouvés
```json
{
  "success": false,
  "message": "Certains crédits n'existent pas ou n'appartiennent pas au commercial spécifié",
  "data": null
}
```

### Erreur: Liste vide
```json
{
  "success": false,
  "message": "La liste des IDs de crédit ne peut pas être vide",
  "data": null
}
```

### Erreur: Crédits non modifiables
```json
{
  "success": false,
  "message": "Tous les crédits doivent être modifiables pour être fusionnés",
  "data": null
}
```

## 5. Validation des données

### Avant fusion - Vérifications automatiques:
- ✅ Tous les crédits appartiennent au même commercial
- ✅ Tous les crédits sont de type PROMOTER
- ✅ Tous les crédits ont updatable = true
- ✅ Tous les crédits ont status = INPROGRESS
- ✅ Tous les crédits ont state = ENABLED

### Après fusion - Résultats:
- 🔄 Nouveau crédit créé avec référence préfixée 'F'
- 🔄 Anciens crédits marqués comme supprimés (state = DELETED)
- 🔄 Distributions (crédits enfants) réassignées au nouveau crédit
- 🔄 Articles de crédit réassignés au nouveau crédit
- 📊 Totaux recalculés (montants, dates, mises journalières)

## 6. Intégration Frontend

### JavaScript/TypeScript Example
```javascript
class CreditMergeService {
  constructor(apiBaseUrl, authToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.authToken = authToken;
  }

  async getMergeableCredits(commercialUsername) {
    const response = await fetch(
      `${this.apiBaseUrl}/api/v1/credits/mergeable/${commercialUsername}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.json();
  }

  async mergeCredits(creditIds, commercialUsername) {
    const response = await fetch(
      `${this.apiBaseUrl}/api/v1/credits/merge`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          creditIds,
          commercialUsername
        })
      }
    );
    return response.json();
  }
}

// Utilisation
const creditService = new CreditMergeService('http://localhost:8080', 'your-jwt-token');

// Récupérer les crédits fusionnables
const mergeableCredits = await creditService.getMergeableCredits('commercial123');

// Fusionner les crédits sélectionnés
const mergeResult = await creditService.mergeCredits([1, 2, 3], 'commercial123');
console.log('Nouvelle référence:', mergeResult.data);
```