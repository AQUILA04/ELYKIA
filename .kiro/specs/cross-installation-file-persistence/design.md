# Cross-Installation File Persistence - Design Document

## Architecture Overview

### Current Problem
```
Documents/elykia/
├── backup-1.sql (créé par installation 1) ❌ Non accessible par installation 2
├── backup-2.sql (créé par installation 1) ❌ Non accessible par installation 2  
└── backup-3.sql (créé par installation 2) ✅ Accessible par installation 2
```

### Root Cause
Android assigne une propriété de fichier (file ownership) basée sur l'UID de l'application. Quand l'app est réinstallée, elle reçoit un nouvel UID et ne peut plus accéder aux fichiers créés avec l'ancien UID, même s'ils sont dans un dossier public.

### Proposed Solution
```
Documents/elykia/
├── backup-1.sql (accessible via MediaStore API)
├── backup-2.sql (accessible via MediaStore API)
└── backup-3.sql (accessible via MediaStore API)
```

**Strategy**: Utiliser l'API MediaStore ou SAF (Storage Access Framework) pour accéder aux fichiers, contournant ainsi les restrictions de propriété de fichiers.

## Technical Design

### 1. Storage Strategy

#### Primary Strategy: MediaStore API (Android 10+)
```typescript
// Use MediaStore to access files regardless of ownership
const files = await this.queryMediaStore({
  selection: MediaStore.Files.FileColumns.RELATIVE_PATH + ' LIKE ?',
  selectionArgs: ['Documents/elykia/%'],
  projection: [MediaStore.Files.FileColumns.DISPLAY_NAME, MediaStore.Files.FileColumns.SIZE]
});
```

#### Secondary Strategy: Storage Access Framework (SAF)
```typescript
// Let user grant persistent access to the elykia folder
const directoryUri = await this.requestDirectoryAccess('Documents/elykia');
const files = await this.listFilesInDirectory(directoryUri);
```

#### Fallback Strategy: File Picker
```typescript
// Manual file selection when other methods fail
const selectedFile = await FilePicker.pickFiles({
  types: ['application/sql', 'text/plain'],
  multiple: true
});
```

### 2. Permission Management

#### Required Permissions (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
                 android:maxSdkVersion="28" />
```

#### Runtime Permission Handling
```typescript
async checkAndRequestPermissions(): Promise<boolean> {
  // Check if permissions are needed (Android 6+)
  // Request permissions if not granted
  // Return permission status
}
```

### 3. Enhanced DatabaseService Methods

#### Modified findAllBackupFiles()
```typescript
async findAllBackupFiles(): Promise<{ path: string, size: number }[]> {
  const strategies = [
    { directory: Directory.Documents, path: 'elykia' },
    { directory: Directory.ExternalStorage, path: 'Documents/elykia' },
    { directory: Directory.Documents, path: 'elykia' } // Legacy private storage
  ];
  
  for (const strategy of strategies) {
    try {
      const files = await this.scanDirectory(strategy);
      if (files.length > 0) return files;
    } catch (error) {
      console.warn(`Strategy failed: ${strategy.path}`, error);
    }
  }
  
  return [];
}
```

#### Enhanced saveBackupToFile()
```typescript
async saveBackupToFile(backupData: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `db-backup-${timestamp}.sql`;
  
  try {
    // Try public storage first
    await this.saveToPublicStorage(fileName, backupData);
  } catch (error) {
    console.warn('Public storage failed, using private storage', error);
    // Fallback to private storage
    await this.saveToPrivateStorage(fileName, backupData);
  }
}
```

### 4. Migration Strategy

#### Detect and Migrate Legacy Files
```typescript
async migrateLegacyBackups(): Promise<void> {
  const legacyFiles = await this.findLegacyBackups();
  const publicPath = await this.getPublicBackupPath();
  
  for (const file of legacyFiles) {
    try {
      const content = await this.readLegacyFile(file);
      await this.saveToPublicStorage(file.name, content);
      console.log(`Migrated: ${file.name}`);
    } catch (error) {
      console.error(`Migration failed for ${file.name}:`, error);
    }
  }
}
```

### 5. File Access Strategies

#### Strategy 1: Direct File System Access
```typescript
async scanDirectory(config: StorageConfig): Promise<FileInfo[]> {
  const result = await Filesystem.readdir({
    path: config.path,
    directory: config.directory
  });
  
  return result.files
    .filter(file => file.name.startsWith('db-backup-') && file.name.endsWith('.sql'))
    .map(file => ({
      path: `${config.path}/${file.name}`,
      size: file.size || 0,
      directory: config.directory
    }));
}
```

#### Strategy 2: File Picker Fallback
```typescript
async selectBackupFileManually(): Promise<string | null> {
  try {
    const result = await FilePicker.pickFiles({
      types: ['application/sql', 'text/plain'],
      multiple: false
    });
    
    return result.files[0]?.path || null;
  } catch (error) {
    console.error('File picker failed:', error);
    return null;
  }
}
```

### 6. Error Handling and User Experience

#### Permission Denied Handling
```typescript
async handlePermissionDenied(): Promise<void> {
  // Show user-friendly message
  const alert = await this.alertController.create({
    header: 'Permissions Required',
    message: 'To access backup files, please grant storage permissions in Settings.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Open Settings', handler: () => this.openAppSettings() },
      { text: 'Select File Manually', handler: () => this.selectBackupFileManually() }
    ]
  });
  
  await alert.present();
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Add required permissions to AndroidManifest.xml
2. Implement permission checking and requesting
3. Create enhanced storage utility methods

### Phase 2: Enhanced Backup Methods
1. Modify `saveBackupToFile()` to use public storage
2. Update `findAllBackupFiles()` with multiple strategies
3. Implement fallback mechanisms

### Phase 3: Migration and Compatibility
1. Add legacy file detection
2. Implement migration functionality
3. Add user prompts for migration

### Phase 4: User Experience
1. Add file picker integration
2. Implement user-friendly error messages
3. Add settings for storage preferences

## Testing Strategy

### Unit Tests
- Permission checking logic
- File path resolution
- Error handling scenarios

### Integration Tests
- Cross-installation file access
- Migration from private to public storage
- Permission request flows

### Manual Testing
- Install app, create backup, uninstall, reinstall, verify access
- Test on different Android versions
- Test permission denial scenarios

## Correctness Properties

### Property 1: File Persistence
**Description**: Backup files created by the application should remain accessible after app reinstallation
**Test**: Create backup → Uninstall app → Reinstall app → Verify backup is accessible

### Property 2: Permission Graceful Degradation
**Description**: Application should function with reduced capabilities when storage permissions are denied
**Test**: Deny permissions → Verify app offers alternatives → Verify core functionality remains

### Property 3: Migration Completeness
**Description**: All legacy backup files should be successfully migrated to public storage
**Test**: Create files in private storage → Run migration → Verify all files copied to public storage

## Security Considerations

- Files in public storage are readable by other apps
- Consider adding file validation to prevent tampering
- Implement backup integrity checks
- Document security implications for users

## Performance Considerations

- Lazy loading of file lists
- Caching of permission status
- Efficient file scanning algorithms
- Progress indicators for large migrations