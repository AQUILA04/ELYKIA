# API de Fusion des Crédits

Cette fonctionnalité permet de fusionner plusieurs crédits d'un commercial en un seul crédit pour faciliter la distribution.

## Endpoints

### 1. Récupérer les crédits fusionnables d'un commercial

**GET** `/api/v1/credits/mergeable/{commercialUsername}`

**Paramètres :**
- `commercialUsername` : Le nom d'utilisateur du commercial

**Réponse :**
```json
[
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
  }
]
```

**Critères de sélection :**
- Status = 'INPROGRESS'
- ClientType = 'PROMOTER'
- Collector = commercialUsername
- Updatable = true
- State = 'ENABLED'

### 2. Fusionner des crédits

**POST** `/api/v1/credits/merge`

**Body :**
```json
{
  "creditIds": [1, 2, 3],
  "commercialUsername": "commercial123"
}
```

**Réponse :**
```json
{
  "success": true,
  "data": "FP24345678901234",
  "message": "Opération réussie"
}
```

## Logique de Fusion

### Validations
1. Tous les crédits doivent appartenir au même commercial
2. Tous les crédits doivent être de type PROMOTER
3. Tous les crédits doivent être modifiables (updatable = true)
4. Tous les crédits doivent exister et être actifs

### Calculs du nouveau crédit
- **totalAmount** : Somme des totalAmount de tous les crédits
- **totalAmountPaid** : Somme des totalAmountPaid de tous les crédits
- **totalAmountRemaining** : Somme des totalAmountRemaining de tous les crédits
- **beginDate** : Date de début la plus ancienne
- **expectedEndDate** : Date de fin attendue la plus récente
- **accountingDate** : Date comptable la plus récente
- **releaseDate** : Date de sortie la plus récente
- **dailyStake** : Somme des mises journalières
- **advance** : Somme des avances
- **reference** : Nouvelle référence générée avec préfixe 'F'

### Propriétés fixes
- **clientType** : PROMOTER
- **updatable** : true
- **status** : INPROGRESS
- **state** : ENABLED
- **client** : Client du premier crédit de la liste

### Mise à jour des relations
1. **Crédits enfants** : Tous les crédits distribués (parent_id) sont mis à jour avec le nouvel ID
2. **Articles de crédit** : Tous les CreditArticles sont associés au nouveau crédit
3. **Anciens crédits** : Marqués comme supprimés (state = DELETED)

## Exemple d'utilisation

1. **Récupérer les crédits fusionnables :**
   ```
   GET /api/v1/credits/mergeable/commercial123
   ```

2. **Fusionner les crédits sélectionnés :**
   ```
   POST /api/v1/credits/merge
   {
     "creditIds": [1, 2, 3],
     "commercialUsername": "commercial123"
   }
   ```

3. **Résultat :** Un nouveau crédit avec la référence commençant par 'F' est créé, et tous les anciens crédits sont marqués comme supprimés.