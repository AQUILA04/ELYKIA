package com.optimize.elykia.client.outbox;

import com.optimize.elykia.client.enumeration.PhotoType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhotoOutboxService {

    private final PhotoOutboxRepository outboxRepository;

    @Value("${photo.fallback.path:/opt/elykia/photos/pending}")
    private String fallbackPath;

    @Transactional
    public void saveFallback(Long clientId, PhotoType type, byte[] bytes) {
        try {
            String fileName = "%d_%s_%d.jpg".formatted(clientId, type.name(), System.currentTimeMillis());
            Path filePath = Paths.get(fallbackPath, fileName);
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, bytes);

            PhotoOutboxEntry entry = new PhotoOutboxEntry();
            entry.setClientId(clientId);
            entry.setPhotoType(type);
            entry.setLocalFilePath(filePath.toAbsolutePath().toString());
            entry.setStatus(OutboxStatus.PENDING);
            outboxRepository.save(entry);

            log.info("Photo outbox entry saved: clientId={}, type={}, path={}", clientId, type, filePath);
        } catch (IOException e) {
            log.error("Erreur lors de la sauvegarde du fallback photo: clientId={}, type={}", clientId, type, e);
        }
    }
}
