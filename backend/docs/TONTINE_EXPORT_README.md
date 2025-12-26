# 📊 Export des Données de Tontine - Documentation Phase 3

## 🎯 Vue d'ensemble

La Phase 3 permet d'exporter les données des sessions de tontine en deux formats :
- **Excel (.xlsx)** : Export détaillé avec 4 feuilles de calcul
- **PDF** : Rapport formaté et imprimable

---

## 🏗️ Architecture

### Composants créés

```
src/main/java/com/optimize/elykia/core/
├── service/
│   └── TontineExportService.java          # Service d'export
└── resources/
    └── templates/
        └── tontine-session-report.html    # Template PDF
```

---

## 📦 Dépendances ajoutées

### Apache POI (Excel)
```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi</artifactId>
    <version>5.2.5</version>
</dependency>

<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
</dependency>
```

### iText (PDF) - Déjà présent
- `itext7-core` : 8.0.5
- `html2pdf` : 5.0.5
- `flying-saucer-pdf` : 9.1.22

---

## 🔌 API Endpoints

### 1. Export Excel

**GET** `/api/v1/tontines/sessions/{sessionId}/export/excel`

**Permissions:** `ROLE_REPORT` ou `ROLE_ADMIN`

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Filename: `tontine_session_{year}.xlsx`

**Exemple:**
```bash
curl -X GET http://localhost:8080/api/v1/tontines/sessions/1/export/excel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o tontine_session_2023.xlsx
```

---

### 2. Export PDF

**GET** `/api/v1/tontines/sessions/{sessionId}/export/pdf`

**Permissions:** `ROLE_REPORT` ou `ROLE_ADMIN`

**Response:**
- Content-Type: `application/pdf`
- Filename: `tontine_session_{year}.pdf`

**Exemple:**
```bash
curl -X GET http://localhost:8080/api/v1/tontines/sessions/1/export/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o tontine_session_2023.pdf
```

---

## 📄 Contenu des exports

### Export Excel (.xlsx)

Le fichier Excel contient **4 feuilles** :

#### Feuille 1 : Statistiques
- Titre du rapport avec année
- Statistiques principales :
  - Nombre total de membres
  - Montant total collecté
  - Contribution moyenne
  - Membres livrés
  - Membres en attente
  - Taux de livraison (%)
- Top 5 commerciaux :
  - Username
  - Nombre de membres
  - Montant collecté

#### Feuille 2 : Liste des membres
Colonnes :
- ID
- Client (nom complet)
- Commercial (collector)
- Total Contribution
- Statut (PENDING/DELIVERED)
- Date d'inscription

#### Feuille 3 : Détail des collectes
Colonnes :
- Membre ID
- Client
- Total Contribution

#### Feuille 4 : Détail des livraisons
Colonnes :
- Membre ID
- Client
- Date livraison
- Montant livré
- Solde restant
- Commercial

**Caractéristiques :**
- ✅ Styles professionnels (en-têtes colorés, bordures)
- ✅ Auto-dimensionnement des colonnes
- ✅ Formatage des nombres
- ✅ Formatage des dates (dd/MM/yyyy HH:mm)

---

### Export PDF

Le PDF contient :

#### En-tête
- Titre : "RAPPORT DE SESSION TONTINE"
- Sous-titre : "Année {year}"
- Bordure inférieure

#### Section Statistiques Générales
Grille 2x3 avec :
- Nombre total de membres
- Montant total collecté (FCFA)
- Contribution moyenne (FCFA)
- Taux de livraison (%)
- Membres livrés
- Membres en attente

#### Section Top Commerciaux
Tableau avec :
- Commercial
- Nombre de membres
- Montant collecté

#### Section Liste des Membres
Tableau avec :
- ID
- Client
- Commercial
- Total Contribution
- Statut (badges colorés)

#### Pied de page
- Date de génération
- Nom du système

**Caractéristiques :**
- ✅ Design responsive
- ✅ Styles CSS intégrés
- ✅ Badges colorés pour les statuts
- ✅ Formatage des nombres avec séparateurs
- ✅ Mise en page professionnelle

---

## ⚙️ Service TontineExportService

### Méthodes principales

#### exportSessionToExcel()
```java
public InputStream exportSessionToExcel(Long sessionId) throws IOException
```

**Processus :**
1. Récupère les statistiques de la session
2. Récupère tous les membres de la session
3. Crée un workbook Excel (XSSFWorkbook)
4. Génère 4 feuilles :
   - Statistiques générales
   - Liste des membres
   - Détail des collectes
   - Détail des livraisons
5. Applique les styles (en-têtes, bordures, couleurs)
6. Auto-dimensionne les colonnes
7. Retourne un InputStream

---

#### exportSessionToPdf()
```java
public InputStream exportSessionToPdf(Long sessionId) throws DocumentException
```

**Processus :**
1. Récupère les statistiques de la session
2. Récupère tous les membres de la session
3. Crée un contexte Thymeleaf
4. Génère le HTML à partir du template
5. Convertit le HTML en PDF (via PdfService)
6. Retourne un InputStream

---

### Méthodes utilitaires

#### createStatsSheet()
Crée la feuille des statistiques avec :
- Titre formaté
- Lignes de statistiques
- Tableau des top commerciaux

#### createMembersSheet()
Crée la feuille de la liste des membres avec :
- En-têtes formatés
- Données des membres
- Formatage des dates

#### createCollectionsSheet()
Crée la feuille des collectes

#### createDeliveriesSheet()
Crée la feuille des livraisons (uniquement membres DELIVERED)

#### createHeaderStyle()
Crée le style pour les en-têtes :
- Police en gras (12pt)
- Fond gris clair
- Bordures

#### createDataStyle()
Crée le style pour les données :
- Bordures simples

---

## 🎨 Template Thymeleaf

### Structure du template

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <style>
        /* Styles CSS intégrés */
    </style>
</head>
<body>
    <!-- En-tête -->
    <div class="header">...</div>
    
    <!-- Statistiques -->
    <div class="stats-section">
        <div class="stats-grid">...</div>
    </div>
    
    <!-- Top Commerciaux -->
    <table>...</table>
    
    <!-- Liste des Membres -->
    <table>...</table>
    
    <!-- Pied de page -->
    <div class="footer">...</div>
</body>
</html>
```

### Variables Thymeleaf

- `${stats}` : SessionStatsDto
- `${members}` : List<TontineMember>
- `${stats.year}` : Année de la session
- `${stats.totalMembers}` : Nombre de membres
- `${stats.topCommercials}` : Liste des top commerciaux

### Formatage

```html
<!-- Formatage des nombres -->
<span th:text="${#numbers.formatDecimal(stats.totalCollected, 0, 'COMMA', 0, 'POINT')} + ' FCFA'">
    25,000,000 FCFA
</span>

<!-- Formatage des dates -->
<span th:text="${#temporals.format(#temporals.createNow(), 'dd/MM/yyyy HH:mm')}">
    18/11/2025 14:30
</span>

<!-- Badges conditionnels -->
<span th:if="${member.deliveryStatus == 'DELIVERED'}" class="badge badge-delivered">
    LIVRÉ
</span>
```

---

## 🔐 Sécurité

### Permissions requises
- **Export Excel** : `ROLE_REPORT` ou `ROLE_ADMIN`
- **Export PDF** : `ROLE_REPORT` ou `ROLE_ADMIN`

### Headers HTTP
```java
HttpHeaders headers = new HttpHeaders();
headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);
headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
headers.add(HttpHeaders.PRAGMA, "no-cache");
headers.add(HttpHeaders.EXPIRES, "0");
```

---

## 🚨 Gestion des erreurs

### Exceptions

| Exception | Code HTTP | Cas |
|-----------|-----------|-----|
| `ResourceNotFoundException` | 404 | Session non trouvée |
| `ResourceNotFoundException` | 404 | Aucune donnée disponible |
| `IOException` | 500 | Erreur génération Excel |
| `DocumentException` | 500 | Erreur génération PDF |

### Messages d'erreur

```java
// Session sans données
"Aucune donnée disponible pour cette session"

// Erreur de génération
"Erreur lors de la génération du fichier"
```

---

## 📝 Exemples d'utilisation

### Avec cURL

#### Export Excel
```bash
curl -X GET "http://localhost:8080/api/v1/tontines/sessions/1/export/excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o session_2023.xlsx
```

#### Export PDF
```bash
curl -X GET "http://localhost:8080/api/v1/tontines/sessions/1/export/pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o session_2023.pdf
```

---

### Avec Java

```java
@Autowired
private TontineExportService exportService;

// Export Excel
InputStream excelStream = exportService.exportSessionToExcel(1L);

// Export PDF
InputStream pdfStream = exportService.exportSessionToPdf(1L);
```

---

### Avec JavaScript (Frontend)

```javascript
// Export Excel
async function exportToExcel(sessionId) {
    const response = await fetch(
        `/api/v1/tontines/sessions/${sessionId}/export/excel`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${sessionId}.xlsx`;
    a.click();
}

// Export PDF
async function exportToPdf(sessionId) {
    const response = await fetch(
        `/api/v1/tontines/sessions/${sessionId}/export/pdf`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${sessionId}.pdf`;
    a.click();
}
```

---

## 🧪 Tests

### Scénarios de test

#### Test 1 : Export Excel - Session normale
```bash
GET /api/v1/tontines/sessions/1/export/excel
```
**Résultat attendu :**
- Status: 200 OK
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Fichier téléchargé avec 4 feuilles

---

#### Test 2 : Export PDF - Session normale
```bash
GET /api/v1/tontines/sessions/1/export/pdf
```
**Résultat attendu :**
- Status: 200 OK
- Content-Type: application/pdf
- PDF généré avec toutes les sections

---

#### Test 3 : Export - Session inexistante
```bash
GET /api/v1/tontines/sessions/999/export/excel
```
**Résultat attendu :**
- Status: 404 NOT FOUND
- Message: "Session non trouvée"

---

#### Test 4 : Export - Session vide
```bash
GET /api/v1/tontines/sessions/4/export/excel
```
**Résultat attendu :**
- Status: 404 NOT FOUND
- Message: "Aucune donnée disponible pour cette session"

---

#### Test 5 : Export - Sans authentification
```bash
GET /api/v1/tontines/sessions/1/export/excel
# Sans header Authorization
```
**Résultat attendu :**
- Status: 401 UNAUTHORIZED

---

#### Test 6 : Export - Permission insuffisante
**Utilisateur :** Role = `ROLE_TONTINE` (pas ROLE_REPORT)

**Résultat attendu :**
- Status: 403 FORBIDDEN

---

## 📊 Performance

### Temps de génération attendus

| Format | Nombre de membres | Temps estimé |
|--------|-------------------|--------------|
| Excel | 100 membres | < 2s |
| Excel | 500 membres | < 5s |
| Excel | 1000 membres | < 10s |
| PDF | 100 membres | < 3s |
| PDF | 500 membres | < 8s |
| PDF | 1000 membres | < 15s |

### Optimisations

- ✅ Génération en mémoire (ByteArrayOutputStream)
- ✅ Pas de fichiers temporaires
- ✅ Récupération des données en une seule requête
- ✅ Styles pré-créés et réutilisés

---

## 🐛 Dépannage

### Problème : OutOfMemoryError
**Cause :** Session avec trop de membres (>5000)

**Solution :**
- Augmenter la mémoire JVM : `-Xmx2g`
- Ou implémenter la pagination pour les exports

---

### Problème : PDF mal formaté
**Cause :** Template HTML invalide

**Solution :**
- Vérifier la syntaxe HTML
- Tester le template avec des données de test
- Vérifier les styles CSS

---

### Problème : Excel corrompu
**Cause :** Erreur lors de l'écriture

**Solution :**
- Vérifier les logs
- S'assurer que le workbook est bien fermé
- Vérifier les données (pas de valeurs nulles)

---

## ✨ Améliorations futures

- [ ] Export avec filtres personnalisés
- [ ] Export de comparaison de sessions
- [ ] Graphiques dans Excel
- [ ] Signature numérique des PDFs
- [ ] Compression des fichiers volumineux
- [ ] Export asynchrone avec notification
- [ ] Cache des exports fréquents
- [ ] Export CSV pour analyse de données

---

## 📞 Support

### Documentation
- README principal : `docs/README_TONTINE.md`
- Phase 2 : `docs/TONTINE_SESSIONS_README.md`
- Changelog : `changelog.md`

### Logs
```bash
tail -f logs/application.log | grep "TontineExportService"
```

---

**Version** : 2.1.0  
**Date** : 18 Novembre 2025  
**Statut** : ✅ Production Ready
