# Plan — Backend : persistance `operationConsentCode`, `confirmedAmount`, `syncConsentCode`

**Statut :** Plan d’implémentation (backend)  
**Date :** mai 2026  
**Périmètre :** `backend/` (API + DB)  
**Objectif :** conserver côté serveur les preuves de consentement journalier (opérations) et de consentement de synchronisation.

---

## 1. Résumé

Le mobile envoie désormais (ou va envoyer) trois champs additionnels **optionnels** dans les payloads des opérations financières :

- **`operationConsentCode`** : code journalier au moment de la création locale de l’opération.
- **`confirmedAmount`** : montant ressaisi par l’utilisateur au moment de la confirmation (égalité stricte avec le montant calculé côté mobile).
- **`syncConsentCode`** : code validé juste avant la session de synchronisation (un par session de sync).

Le backend doit pouvoir **persister** ces champs sur les entités et/ou dans des tables d’audit, sans casser la compatibilité avec les clients existants (champs absents).

---

## 2. Données à persister (source mobile)

### 2.1 Champs par type d’opération

| Opération | Champ montant | Champs à persister |
|----------|---------------|-------------------|
| Distribution | `totalAmount` | `confirmedAmount`, `operationConsentCode`, `syncConsentCode` |
| Recouvrement | `amount` | `confirmedAmount`, `operationConsentCode`, `syncConsentCode` |
| Commande | `totalAmount` | `confirmedAmount`, `operationConsentCode`, `syncConsentCode` |
| Inscription tontine | (pas de montant immédiat) | `operationConsentCode`, `syncConsentCode` |
| Collecte tontine | `amount` | `confirmedAmount`, `operationConsentCode`, `syncConsentCode` |
| Livraison tontine | `totalAmount` (dérivé) | `operationConsentCode`, `syncConsentCode` |

### 2.2 Règles de compatibilité

- Tous ces champs doivent être **optionnels** côté API (non requis).
- Si absent, le backend :
  - ne doit pas rejeter la requête,
  - peut stocker `NULL`.

---

## 3. Modèle de persistance recommandé

### Option A (simple) — colonnes sur les tables existantes

Ajouter 3 colonnes (ou 2 selon l’entité) sur les tables métier :

- `operation_consent_code` (VARCHAR/TEXT, nullable)
- `confirmed_amount` (DECIMAL/NUMERIC, nullable) — uniquement si l’entité a un montant saisi
- `sync_consent_code` (VARCHAR/TEXT, nullable)

**Avantages**
- Facile à requêter.
- Faible coût d’implémentation.

**Inconvénients**
- Audit minimal (pas d’horodatage du consentement / pas de version de message).

### Option B (audit) — table d’audit dédiée + colonnes minimales

1) Conserver au minimum `operation_consent_code` et `confirmed_amount` sur l’entité.
2) Ajouter une table d’audit pour la sync (et/ou l’opération) :

- `operation_consent_audit` : associer `entityType`, `entityId`, `operationConsentCode`, `confirmedAmount`, `createdAt`, `actor`, etc.
- `sync_consent_audit` : associer `syncConsentCode`, `startedAt`, `commercialUsername`, `deviceId`, `batchId`, etc.

**Avantages**
- Traçabilité robuste, extensible.

**Inconvénients**
- Plus long à implémenter.

> Recommandation : **Option A** en phase 1 (conservation), Option B ensuite si besoin d’audit plus strict.

---

## 4. Changements DB (migration)

### 4.1 Distributions (crédits / distributions)

Ajouter :
- `operation_consent_code` TEXT NULL
- `confirmed_amount` NUMERIC NULL
- `sync_consent_code` TEXT NULL

### 4.2 Recoveries (recouvrements)

Ajouter :
- `operation_consent_code` TEXT NULL
- `confirmed_amount` NUMERIC NULL
- `sync_consent_code` TEXT NULL

### 4.3 Orders (commandes)

Ajouter :
- `operation_consent_code` TEXT NULL
- `confirmed_amount` NUMERIC NULL
- `sync_consent_code` TEXT NULL

### 4.4 Tontine

Ajouter :
- `tontine_members.operation_consent_code` TEXT NULL
- `tontine_members.sync_consent_code` TEXT NULL

Ajouter :
- `tontine_collections.operation_consent_code` TEXT NULL
- `tontine_collections.confirmed_amount` NUMERIC NULL
- `tontine_collections.sync_consent_code` TEXT NULL

Ajouter :
- `tontine_deliveries.operation_consent_code` TEXT NULL
- `tontine_deliveries.sync_consent_code` TEXT NULL

### 4.5 Notes techniques migration

- Définir des migrations **idempotentes** (ou via Flyway/Liquibase selon le projet).
- Prévoir des index uniquement si des recherches métier seront faites :
  - index sur `operation_consent_code` (rarement nécessaire)
  - index sur `sync_consent_code` (utile pour debug/audit)

---

## 5. Entités backend (JPA / ORM)

Pour chaque entité concernée, ajouter des champs :

- `operationConsentCode: String?`
- `confirmedAmount: BigDecimal?` (si applicable)
- `syncConsentCode: String?`

Annotations recommandées :
- `@Column(name = "operation_consent_code")`
- `@Column(name = "confirmed_amount", precision = 19, scale = 2)` (adapter selon devise)
- `@Column(name = "sync_consent_code")`

---

## 6. DTO et mapping API

### 6.1 DTO entrants (request)

Ajouter les champs **optionnels** aux DTO utilisés par les endpoints mobile, par ex. :

- `DistributionSyncRequestDto`
- `DefaultDailyStakeRequestDto` / `SpecialDailyStakeRequestDto` (stakeUnits)
- `OrderCreateRequestDto`
- `TontineMemberCreateRequestDto`
- `TontineCollectionCreateRequestDto`
- `TontineDeliveryDistributeRequestDto`

**Règles**
- Ne pas rendre les champs obligatoires.
- Mapper vers entité (si Option A) ou vers audit (si Option B).

### 6.2 DTO sortants (response)

Optionnel (selon besoins) :
- exposer ces champs dans les réponses,
- ou les garder internes backend.

---

## 7. Validation backend (phase 1)

Phase 1 (non bloquante) :
- Accepter et persister les champs si présents.
- Ne pas vérifier l’égalité `confirmedAmount` vs montant calculé serveur (sauf si exigence forte), car :
  - le serveur peut recalculer différemment,
  - l’objectif principal est la **preuve d’intention** côté mobile.

Phase 2 (optionnelle) :
- Si le serveur dispose d’un montant de référence fiable, journaliser une alerte si `confirmedAmount` ≠ montant serveur.

---

## 8. Compatibilité / Rollout

- Backend peut être déployé avant le mobile (champs absents → NULL).
- Mobile peut être déployé avant le backend si les champs sont ignorés côté serveur (mais **idéalement** backend d’abord pour ne pas perdre la donnée).

---

## 9. Test plan backend

- **Migration** : vérifier que les colonnes existent sur chaque table.
- **API** : envoyer des payloads avec et sans ces champs, vérifier :
  - HTTP 200/201 inchangé,
  - valeur persistée (lecture DB).
- **Sync** : un lot de sync doit écrire `syncConsentCode` sur les entités créées pendant la session.

---

## 10. Exemple de payloads (indicatif)

### Distribution (ex. patch distribute-articles)

```json
{
  "clientId": 123,
  "totalAmount": 125000,
  "confirmedAmount": 125000,
  "operationConsentCode": "K7M3P2",
  "syncConsentCode": "X9B4NR"
}
```

### Recouvrement (stakeUnits)

```json
{
  "collector": "john",
  "syncConsentCode": "X9B4NR",
  "stakeUnits": [
    {
      "recoveryId": "REC-2026ABC-1A2B3C",
      "creditId": 456,
      "confirmedAmount": 5000,
      "operationConsentCode": "K7M3P2"
    }
  ]
}
```

