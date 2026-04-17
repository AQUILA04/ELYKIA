package com.optimize.elykia.client.config;

import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.ClientService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@RequiredArgsConstructor
@Component
@Slf4j
public class PhotoMigrationInitializer {
    private final ClientService clientService;
    @Value(value = "${optimize.client.migrate-photo.enabled}")
    private boolean isPhotoMigrationEnabled;

    @PostConstruct
    public void migrate() {
        if (isPhotoMigrationEnabled) {
            long startTime = LocalDateTime.now().toInstant(java.time.ZoneOffset.UTC).toEpochMilli();
            log.info("Starting photo migration at :  {}", LocalDateTime.now());
            clientService.migratePhoto();
            log.info("Photo migration completed at :  {} in {} ms ", LocalDateTime.now(), LocalDateTime.now().toInstant(java.time.ZoneOffset.UTC).toEpochMilli() - startTime);
        }

    }
}
