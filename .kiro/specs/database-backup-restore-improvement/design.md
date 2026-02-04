# Design - Amélioration du Système de Restauration de Base de Données

## Architecture

### Vue d'ensemble
Le système de restauration amélioré sera structuré en plusieurs couches :
1. **Couche de validation** : Validation du fichier et parsing SQL robuste
2. **Couche transactionnelle** : Gestion des transactions et rollback
3. **Couche de monitoring** : Suivi du progrès et collecte des métriques
4. **Couche de validation post-restauration** : Vérification de l'intégrité

### Composants principaux

#### 1. RestoreValidator
Responsable de la validation du fichier de sauvegarde et du parsing SQL.

```typescript
interface RestoreValidator {
  validateBackupFile(content: string): ValidationResult;
  parseSqlStatements(content: string): SqlStatement[];
  validateSqlStatement(statement: SqlStatement): boolean;
}
```

#### 2. TransactionManager
Gère les transactions et le rollback en cas d'erreur.

```typescript
interface TransactionManager {
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeInTransaction(operations: SqlOperation[]): Promise<TransactionResult>;
}
```

#### 3. RestoreMonitor
Suit le progrès et collecte les métriques de restauration.

```typescript
interface RestoreMonitor {
  startMonitoring(totalOperations: number): void;
  updateProgress(completed: number, errors: number): void;
  recordError(error: RestoreError): void;
  generateReport(): RestoreReport;
}
```

#### 4. DataIntegrityValidator
Valide l'intégrité des données après restauration.

```typescript
interface DataIntegrityValidator {
  validateTableCounts(expectedCounts: TableCounts): Promise<ValidationResult>;
  validateForeignKeys(): Promise<ValidationResult>;
  validateCriticalData(): Promise<ValidationResult>;
}
```

## Modèles de données

### RestoreResult
```typescript
interface RestoreResult {
  success: boolean;
  totalStatements: number;
  successfulStatements: number;
  failedStatements: number;
  errors: RestoreError[];
  duration: number;
  tablesRestored: TableRestoreInfo[];
  integrityCheck: IntegrityCheckResult;
}
```

### RestoreError
```typescript
interface RestoreError {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  statement: string;
  error: string;
  table?: string;
  lineNumber?: number;
}
```

### SqlStatement
```typescript
interface SqlStatement {
  type: 'DELETE' | 'INSERT' | 'UPDATE' | 'CREATE' | 'DROP';
  table: string;
  content: string;
  lineNumber: number;
  isMultiLine: boolean;
}
```

## Flux de traitement amélioré

### 1. Phase de validation
```typescript
async validateAndPrepare(backupContent: string): Promise<PreparedRestore> {
  // 1. Validation du format du fichier
  const validation = this.validator.validateBackupFile(backupContent);
  if (!validation.isValid) {
    throw new RestoreError('CRITICAL', 'Invalid backup file format');
  }

  // 2. Parsing SQL robuste
  const statements = this.validator.parseSqlStatements(backupContent);
  
  // 3. Validation des instructions SQL
  const validStatements = statements.filter(stmt => 
    this.validator.validateSqlStatement(stmt)
  );

  return {
    statements: validStatements,
    expectedCounts: this.calculateExpectedCounts(validStatements),
    metadata: validation.metadata
  };
}
```

### 2. Phase d'exécution transactionnelle
```typescript
async executeRestore(prepared: PreparedRestore): Promise<RestoreResult> {
  const monitor = new RestoreMonitor();
  monitor.startMonitoring(prepared.statements.length);

  try {
    await this.transactionManager.beginTransaction();
    
    const results = await this.executeStatementsWithProgress(
      prepared.statements, 
      monitor
    );
    
    // Validation de l'intégrité avant commit
    const integrityCheck = await this.validateIntegrity(prepared.expectedCounts);
    
    if (integrityCheck.isValid) {
      await this.transactionManager.commitTransaction();
    } else {
      await this.transactionManager.rollbackTransaction();
      throw new RestoreError('CRITICAL', 'Integrity check failed');
    }
    
    return monitor.generateReport();
    
  } catch (error) {
    await this.transactionManager.rollbackTransaction();
    throw error;
  }
}
```

### 3. Parser SQL amélioré
```typescript
parseSqlStatements(content: string): SqlStatement[] {
  const statements: SqlStatement[] = [];
  const lines = content.split('\n');
  let currentStatement = '';
  let currentLineNumber = 0;
  let inMultiLineStatement = false;
  let inStringLiteral = false;
  let stringDelimiter = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    currentLineNumber = i + 1;

    // Ignorer les commentaires et lignes vides
    if (!line || line.startsWith('--')) continue;

    // Gestion des chaînes de caractères multi-lignes
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (!inStringLiteral && (char === "'" || char === '"')) {
        inStringLiteral = true;
        stringDelimiter = char;
      } else if (inStringLiteral && char === stringDelimiter) {
        // Vérifier si c'est un échappement
        if (j === 0 || line[j-1] !== '\\') {
          inStringLiteral = false;
          stringDelimiter = '';
        }
      }
    }

    currentStatement += line + '\n';

    // Détecter la fin d'une instruction (point-virgule hors chaîne)
    if (!inStringLiteral && line.endsWith(';')) {
      const statement = this.createSqlStatement(
        currentStatement.trim(), 
        currentLineNumber,
        inMultiLineStatement
      );
      
      if (statement) {
        statements.push(statement);
      }
      
      currentStatement = '';
      inMultiLineStatement = false;
    } else if (currentStatement.trim()) {
      inMultiLineStatement = true;
    }
  }

  return statements;
}
```

## Gestion des erreurs améliorée

### Classification des erreurs
```typescript
enum ErrorSeverity {
  CRITICAL = 'CRITICAL',    // Arrête la restauration
  WARNING = 'WARNING',      // Continue mais signale
  INFO = 'INFO'            // Information seulement
}

const ERROR_CLASSIFICATION = {
  'UNIQUE constraint failed': ErrorSeverity.WARNING,
  'FOREIGN KEY constraint failed': ErrorSeverity.CRITICAL,
  'no such table': ErrorSeverity.CRITICAL,
  'syntax error': ErrorSeverity.CRITICAL,
  'database is locked': ErrorSeverity.CRITICAL
};
```

### Stratégie de récupération
```typescript
async handleRestoreError(error: Error, statement: SqlStatement): Promise<ErrorAction> {
  const severity = this.classifyError(error);
  
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return ErrorAction.ABORT;
      
    case ErrorSeverity.WARNING:
      this.monitor.recordError({
        type: 'WARNING',
        statement: statement.content,
        error: error.message,
        table: statement.table
      });
      return ErrorAction.CONTINUE;
      
    case ErrorSeverity.INFO:
      return ErrorAction.CONTINUE;
  }
}
```

## Validation de l'intégrité

### Vérifications post-restauration
```typescript
async validateIntegrity(expectedCounts: TableCounts): Promise<IntegrityCheckResult> {
  const results: ValidationResult[] = [];

  // 1. Vérification des comptes de tables
  results.push(await this.validateTableCounts(expectedCounts));

  // 2. Vérification des clés étrangères
  results.push(await this.validateForeignKeys());

  // 3. Vérification des données critiques
  results.push(await this.validateCriticalData());

  // 4. Vérification de la cohérence métier
  results.push(await this.validateBusinessRules());

  return {
    isValid: results.every(r => r.isValid),
    results: results,
    summary: this.generateIntegritySummary(results)
  };
}
```

### Validation des règles métier
```typescript
async validateBusinessRules(): Promise<ValidationResult> {
  const checks = [
    // Chaque client doit avoir un compte
    this.checkClientAccountConsistency(),
    
    // Les soldes de comptes doivent être cohérents
    this.checkAccountBalanceConsistency(),
    
    // Les distributions doivent avoir des items
    this.checkDistributionItemConsistency()
  ];

  const results = await Promise.all(checks);
  
  return {
    isValid: results.every(r => r.isValid),
    errors: results.flatMap(r => r.errors),
    details: results
  };
}
```

## Interface utilisateur améliorée

### Composant de progression
```typescript
interface RestoreProgressComponent {
  showProgress(totalSteps: number): void;
  updateProgress(currentStep: number, message: string): void;
  showError(error: RestoreError): void;
  showSuccess(result: RestoreResult): void;
  showReport(report: RestoreReport): void;
}
```

### Messages utilisateur
```typescript
const RESTORE_MESSAGES = {
  VALIDATING: 'Validation du fichier de sauvegarde...',
  PARSING: 'Analyse des instructions SQL...',
  EXECUTING: 'Restauration en cours... ({current}/{total})',
  VALIDATING_INTEGRITY: 'Vérification de l\'intégrité des données...',
  SUCCESS: 'Restauration terminée avec succès',
  PARTIAL_SUCCESS: 'Restauration terminée avec {errorCount} avertissements',
  FAILURE: 'Échec de la restauration'
};
```

## Propriétés de correction

### Propriété 1: Atomicité de la restauration
```typescript
// **Valide: Exigences 2.1, 2.2**
// La restauration doit être atomique : soit toutes les données sont restaurées, soit aucune
property('restore_atomicity', async (backupData: BackupData) => {
  const initialState = await captureDbState();
  
  try {
    const result = await restoreService.restoreFromBackup(backupData.content);
    
    if (result.success) {
      // Si succès, toutes les données doivent être présentes
      const finalState = await captureDbState();
      return validateCompleteRestore(initialState, finalState, backupData);
    } else {
      // Si échec, la DB doit être dans l'état initial
      const finalState = await captureDbState();
      return deepEqual(initialState, finalState);
    }
  } catch (error) {
    // En cas d'exception, la DB doit être dans l'état initial
    const finalState = await captureDbState();
    return deepEqual(initialState, finalState);
  }
});
```

### Propriété 2: Cohérence des comptes de données
```typescript
// **Valide: Exigences 1.3, 4.1**
// Le nombre d'enregistrements restaurés doit correspondre au contenu du fichier
property('restore_data_counts', async (validBackupFile: string) => {
  const expectedCounts = parseExpectedCounts(validBackupFile);
  const result = await restoreService.restoreFromBackup(validBackupFile);
  
  if (result.success) {
    const actualCounts = await getActualTableCounts();
    return Object.keys(expectedCounts).every(table => 
      expectedCounts[table] === actualCounts[table]
    );
  }
  
  return true; // Si échec, pas de vérification de compte
});
```

### Propriété 3: Gestion correcte des erreurs
```typescript
// **Valide: Exigences 1.1, 1.2**
// Les erreurs doivent être correctement classifiées et traitées
property('restore_error_handling', async (backupWithErrors: BackupData) => {
  const result = await restoreService.restoreFromBackup(backupWithErrors.content);
  
  // Vérifier que les erreurs critiques causent un échec
  const hasCriticalErrors = result.errors.some(e => e.type === 'CRITICAL');
  if (hasCriticalErrors) {
    return !result.success;
  }
  
  // Vérifier que les avertissements n'empêchent pas le succès
  const hasOnlyWarnings = result.errors.every(e => e.type === 'WARNING');
  if (hasOnlyWarnings) {
    return result.success;
  }
  
  return true;
});
```

### Propriété 4: Intégrité référentielle
```typescript
// **Valide: Exigences 4.2, 4.3**
// L'intégrité référentielle doit être maintenue après restauration
property('restore_referential_integrity', async (validBackupFile: string) => {
  const result = await restoreService.restoreFromBackup(validBackupFile);
  
  if (result.success) {
    // Vérifier que toutes les clés étrangères sont valides
    const integrityCheck = await validateReferentialIntegrity();
    return integrityCheck.isValid;
  }
  
  return true; // Si échec de restauration, pas de vérification d'intégrité
});
```

## Tests et validation

### Tests unitaires
- Validation du parser SQL avec différents formats
- Test des gestionnaires d'erreurs
- Validation des règles métier

### Tests d'intégration
- Restauration complète avec fichiers réels
- Gestion des erreurs en conditions réelles
- Performance avec gros volumes de données

### Tests de propriétés
- Atomicité des transactions
- Cohérence des données
- Gestion des erreurs
- Intégrité référentielle

## Métriques et monitoring

### Métriques de performance
- Temps de restauration par taille de fichier
- Nombre d'instructions SQL par seconde
- Utilisation mémoire pendant la restauration

### Métriques de qualité
- Taux de succès des restaurations
- Distribution des types d'erreurs
- Temps de validation de l'intégrité

### Alertes
- Échecs de restauration répétés
- Temps de restauration anormalement long
- Erreurs d'intégrité détectées