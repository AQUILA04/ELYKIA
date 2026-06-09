package com.optimize.elykia.client.outbox;

import com.optimize.elykia.client.enumeration.PhotoType;
import com.optimize.elykia.client.dto.UpdatePhotoUrlDto;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.client.storage.PhotoObjectKeyBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PhotoOutboxRetryScheduler {

    private final MinioStorageService minioStorageService;
    private final PhotoOutboxRepository outboxRepository;
    private final ClientService clientService;

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void retryPendingPhotos() {
        if (!minioStorageService.isAvailable()) {
            log.debug("MinIO indisponible, report de la tentative outbox");
            return;
        }

        List<PhotoOutboxEntry> entries = outboxRepository
                .findByStatusInAndRetryCountLessThan(
                        List.of(OutboxStatus.PENDING, OutboxStatus.FAILED), 5);

        for (PhotoOutboxEntry entry : entries) {
            try {
                entry.setStatus(OutboxStatus.IN_PROGRESS);
                outboxRepository.save(entry);

                byte[] bytes = Files.readAllBytes(Path.of(entry.getLocalFilePath()));
                String objectKey = entry.getPhotoType() == PhotoType.PROFIL
                        ? PhotoObjectKeyBuilder.profilOriginal(entry.getClientId())
                        : PhotoObjectKeyBuilder.cardOriginal(entry.getClientId());
                String url = minioStorageService.uploadPhoto(objectKey, bytes, "image/jpeg");
                if (entry.getPhotoType() == PhotoType.PROFIL) {
                    clientService.updateClientPhotoUrl(new UpdatePhotoUrlDto(entry.getClientId(), url, null));
                } else {
                    clientService.updateClientPhotoUrl(new UpdatePhotoUrlDto(entry.getClientId(), null, url));
                }

                Files.deleteIfExists(Path.of(entry.getLocalFilePath()));
                entry.setStatus(OutboxStatus.DONE);
                outboxRepository.save(entry);

                log.info("Photo outbox traitée avec succès: clientId={}, type={}", entry.getClientId(), entry.getPhotoType());
            } catch (Exception e) {
                entry.setRetryCount(entry.getRetryCount() + 1);
                entry.setLastAttemptAt(LocalDateTime.now());
                entry.setErrorMessage(e.getMessage());
                if (entry.getRetryCount() >= 5) {
                    entry.setStatus(OutboxStatus.FAILED);
                    log.error("Photo outbox: abandon après 5 tentatives. clientId={}, path={}",
                            entry.getClientId(), entry.getLocalFilePath());
                } else {
                    entry.setStatus(OutboxStatus.PENDING);
                }
                outboxRepository.save(entry);
            }
        }
    }
}
