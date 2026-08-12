package com.optimize.elykia.client.config;

import com.optimize.elykia.client.migration.PhotoMigrationJob;
import com.optimize.elykia.client.service.ClientService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Au démarrage (si activé) :
 * 1) migratePhoto() — déplace les bytes client → photo_store (legacy)
 * 2) PhotoMigrationJob — upload photo_store → MinIO (original + thumb) + URLs client
 */
@RequiredArgsConstructor
@Component
@Slf4j
public class PhotoMigrationInitializer {
    private final ClientService clientService;
    private final PhotoMigrationJob photoMigrationJob;

    @Value("${optimize.client.migrate-photo.enabled:false}")
    private boolean isPhotoMigrationEnabled;

    @PostConstruct
    public void migrate() {
        if (!isPhotoMigrationEnabled) {
            return;
        }
        long startTime = LocalDateTime.now().toInstant(java.time.ZoneOffset.UTC).toEpochMilli();
        log.info("Starting legacy photo_store migration at : {}", LocalDateTime.now());
        clientService.migratePhoto();
        log.info("Starting MinIO photo migration at : {}", LocalDateTime.now());
        photoMigrationJob.runMigration();
        log.info("Photo migration completed at : {} in {} ms ",
                LocalDateTime.now(),
                LocalDateTime.now().toInstant(java.time.ZoneOffset.UTC).toEpochMilli() - startTime);
    }
}
