package com.optimize.elykia.client.migration;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.entity.PhotoStore;
import com.optimize.elykia.client.enumeration.PhotoType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.repository.PhotoStoreRepository;
import com.optimize.elykia.client.storage.ImageProcessingService;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.client.storage.PhotoObjectKeyBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.concurrent.atomic.AtomicLong;

@Component
@RequiredArgsConstructor
@Slf4j
public class PhotoMigrationJobImpl implements PhotoMigrationJob {

    private final PhotoStoreRepository photoStoreRepository;
    private final ClientRepository clientRepository;
    private final ImageProcessingService imageProcessingService;
    private final MinioStorageService minioStorageService;

    private volatile MigrationStatus currentStatus;

    @Override
    @Transactional
    public MigrationReport runMigration() {
        if (!minioStorageService.isAvailable()) {
            log.warn("PhotoMigration: MinIO indisponible — migration annulée");
            return new MigrationReport(0, 0, 0, 1);
        }

        long total = photoStoreRepository.count();
        AtomicLong migrated = new AtomicLong(0);
        AtomicLong skipped = new AtomicLong(0);
        AtomicLong errors = new AtomicLong(0);

        int page = 0;
        int size = 10;
        Page<PhotoStore> photoPage;

        do {
            photoPage = photoStoreRepository.findAll(PageRequest.of(page, size));

            for (PhotoStore photoStore : photoPage) {
                Long clientId = photoStore.getClientId();
                Client client = clientRepository.findById(clientId).orElse(null);

                if (client == null) {
                    errors.incrementAndGet();
                    log.warn("PhotoMigration: Client {} introuvable, skip", clientId);
                    continue;
                }

                String urlField = photoStore.getType() == PhotoType.PROFIL
                        ? client.getProfilPhotoUrl()
                        : client.getCardPhotoUrl();

                if (StringUtils.hasText(urlField)) {
                    skipped.incrementAndGet();
                    continue;
                }

                try {
                    byte[] originalBytes = photoStore.getPhoto();
                    if (originalBytes == null || originalBytes.length == 0) {
                        skipped.incrementAndGet();
                        continue;
                    }

                    byte[] thumbBytes = imageProcessingService.generateThumbnail(originalBytes, 200, 200);
                    String originalKey;
                    String thumbKey;
                    if (photoStore.getType() == PhotoType.PROFIL) {
                        originalKey = PhotoObjectKeyBuilder.profilOriginal(clientId);
                        thumbKey = PhotoObjectKeyBuilder.profilThumb(clientId);
                    } else {
                        originalKey = PhotoObjectKeyBuilder.cardOriginal(clientId);
                        thumbKey = PhotoObjectKeyBuilder.cardThumb(clientId);
                    }

                    String originalUrl = minioStorageService.uploadPhoto(originalKey, originalBytes, "image/jpeg");
                    String thumbUrl = minioStorageService.uploadPhoto(thumbKey, thumbBytes, "image/jpeg");

                    if (photoStore.getType() == PhotoType.PROFIL) {
                        client.setProfilPhotoUrl(originalUrl);
                        client.setProfilPhotoThumbUrl(thumbUrl);
                    } else {
                        client.setCardPhotoUrl(originalUrl);
                        client.setCardPhotoThumbUrl(thumbUrl);
                    }
                    clientRepository.saveAndFlush(client);
                    migrated.incrementAndGet();
                } catch (Exception e) {
                    errors.incrementAndGet();
                    log.error("PhotoMigration: erreur client {}: {}", clientId, e.getMessage());
                }

                currentStatus = new MigrationStatus(
                        true,
                        migrated.get() + skipped.get() + errors.get(),
                        total,
                        migrated.get(),
                        skipped.get(),
                        errors.get());
            }
            page++;
        } while (photoPage.hasNext());

        currentStatus = new MigrationStatus(false, total, total, migrated.get(), skipped.get(), errors.get());
        log.info("PhotoMigration terminée: total={}, migrated={}, skipped={}, errors={}",
                total, migrated.get(), skipped.get(), errors.get());
        return new MigrationReport(total, migrated.get(), skipped.get(), errors.get());
    }

    @Override
    public MigrationStatus getStatus() {
        return currentStatus != null
                ? currentStatus
                : new MigrationStatus(false, 0, 0, 0, 0, 0);
    }
}
