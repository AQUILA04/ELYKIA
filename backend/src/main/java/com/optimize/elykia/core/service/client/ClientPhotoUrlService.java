package com.optimize.elykia.core.service.client;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.repository.spec.ClientCommercialPredicates;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.PhotoObjectKeyBuilder;
import com.optimize.elykia.core.dto.client.ClientPhotoKind;
import com.optimize.elykia.core.dto.client.ClientPhotoSize;
import com.optimize.elykia.core.dto.client.ClientPhotoUrlDto;
import com.optimize.elykia.core.dto.client.ClientPhotoUrlRequest;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Issues short-lived MinIO GET URLs for private client photos.
 * Signing uses a dedicated client pointed at {@link MinioProperties#getPublicUrl()} so the
 * signature Host matches Traefik ({@code s3.optimizesolux.com}).
 */
@Service
@Slf4j
public class ClientPhotoUrlService {

    public static final int MAX_BATCH_SIZE = 200;

    private final ClientRepository clientRepository;
    private final UserService userService;
    private final MinioProperties minioProperties;
    private final int expiryMinutes;
    private final int cacheMarginMinutes;

    /** Optional override for unit tests; when null, built in {@link #initSigningClient()}. */
    private MinioClient signingClient;

    private final ConcurrentHashMap<String, CachedUrl> urlCache = new ConcurrentHashMap<>();

    public ClientPhotoUrlService(
            ClientRepository clientRepository,
            UserService userService,
            MinioProperties minioProperties,
            @Value("${elykia.photos.presign-expiry-minutes:60}") int expiryMinutes) {
        this.clientRepository = clientRepository;
        this.userService = userService;
        this.minioProperties = minioProperties;
        this.expiryMinutes = Math.max(1, expiryMinutes);
        this.cacheMarginMinutes = Math.max(1, this.expiryMinutes / 6);
    }

    /** Package-visible for tests. */
    ClientPhotoUrlService(
            ClientRepository clientRepository,
            UserService userService,
            MinioProperties minioProperties,
            int expiryMinutes,
            MinioClient signingClient) {
        this(clientRepository, userService, minioProperties, expiryMinutes);
        this.signingClient = signingClient;
    }

    @PostConstruct
    void initSigningClient() {
        if (signingClient != null) {
            return;
        }
        String publicUrl = minioProperties.getPublicUrl();
        if (!StringUtils.hasText(publicUrl)) {
            log.warn("minio.public-url is empty — client photo presigning will fail until configured");
            return;
        }
        this.signingClient = MinioClient.builder()
                .endpoint(publicUrl)
                .region("us-east-1")
                .credentials(minioProperties.getAccessKey(), minioProperties.getSecretKey())
                .build();
    }

    public List<ClientPhotoUrlDto> resolveUrls(ClientPhotoUrlRequest request) {
        if (request.getClientIds() == null || request.getClientIds().isEmpty()) {
            return List.of();
        }
        if (request.getClientIds().size() > MAX_BATCH_SIZE) {
            throw new CustomValidationException(
                    "Au plus " + MAX_BATCH_SIZE + " clients par demande de photos.");
        }
        ClientPhotoKind kind = request.getKind() != null ? request.getKind() : ClientPhotoKind.PROFIL;
        ClientPhotoSize size = request.getSize() != null ? request.getSize() : ClientPhotoSize.THUMB;

        User user = userService.getCurrentUser();
        boolean globalAccess = hasGlobalPhotoAccess(user);
        String username = user != null ? user.getUsername() : null;

        List<Client> clients = clientRepository.findAllByIds(request.getClientIds());
        List<ClientPhotoUrlDto> result = new ArrayList<>(clients.size());

        for (Client client : clients) {
            if (!globalAccess && !isInPortfolio(username, client)) {
                continue;
            }
            result.add(buildEntry(client, kind, size));
        }
        return result;
    }

    private ClientPhotoUrlDto buildEntry(Client client, ClientPhotoKind kind, ClientPhotoSize size) {
        String preferredUrl = resolveStoredUrl(client, kind, size);
        String fallbackUrl = size == ClientPhotoSize.THUMB
                ? resolveStoredUrl(client, kind, ClientPhotoSize.ORIGINAL)
                : null;

        if (!StringUtils.hasText(preferredUrl) && !StringUtils.hasText(fallbackUrl)) {
            return new ClientPhotoUrlDto(client.getId(), null, null, true);
        }

        boolean useThumb = StringUtils.hasText(preferredUrl) && size == ClientPhotoSize.THUMB
                && StringUtils.hasText(clientThumbField(client, kind));
        String objectKey = objectKey(client.getId(), kind, useThumb ? ClientPhotoSize.THUMB : ClientPhotoSize.ORIGINAL);

        try {
            CachedUrl cached = getOrCreatePresigned(objectKey);
            return new ClientPhotoUrlDto(client.getId(), cached.url(), cached.expiresAt(), false);
        } catch (Exception e) {
            log.error("Failed to presign client photo clientId={} key={}: {}",
                    client.getId(), objectKey, e.getMessage());
            return new ClientPhotoUrlDto(client.getId(), null, null, false);
        }
    }

    private CachedUrl getOrCreatePresigned(String objectKey) throws Exception {
        Instant now = Instant.now();
        CachedUrl existing = urlCache.get(objectKey);
        if (existing != null && existing.usableUntil().isAfter(now)) {
            return existing;
        }
        if (signingClient == null) {
            throw new IllegalStateException("MinIO signing client is not configured (minio.public-url)");
        }
        int expirySeconds = expiryMinutes * 60;
        String url = signingClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                        .method(Method.GET)
                        .bucket(minioProperties.getBucket())
                        .object(objectKey)
                        .expiry(expirySeconds)
                        .build());
        Instant expiresAt = now.plusSeconds(expirySeconds);
        Instant usableUntil = expiresAt.minusSeconds(cacheMarginMinutes * 60L);
        if (usableUntil.isBefore(now.plusSeconds(30))) {
            usableUntil = now.plusSeconds(30);
        }
        CachedUrl created = new CachedUrl(url, expiresAt, usableUntil);
        urlCache.put(objectKey, created);
        return created;
    }

    private static String resolveStoredUrl(Client client, ClientPhotoKind kind, ClientPhotoSize size) {
        if (kind == ClientPhotoKind.CARD) {
            return size == ClientPhotoSize.THUMB ? client.getCardPhotoThumbUrl() : client.getCardPhotoUrl();
        }
        return size == ClientPhotoSize.THUMB ? client.getProfilPhotoThumbUrl() : client.getProfilPhotoUrl();
    }

    private static String clientThumbField(Client client, ClientPhotoKind kind) {
        return kind == ClientPhotoKind.CARD ? client.getCardPhotoThumbUrl() : client.getProfilPhotoThumbUrl();
    }

    private static String objectKey(Long clientId, ClientPhotoKind kind, ClientPhotoSize size) {
        if (kind == ClientPhotoKind.CARD) {
            return size == ClientPhotoSize.THUMB
                    ? PhotoObjectKeyBuilder.cardThumb(clientId)
                    : PhotoObjectKeyBuilder.cardOriginal(clientId);
        }
        return size == ClientPhotoSize.THUMB
                ? PhotoObjectKeyBuilder.profilThumb(clientId)
                : PhotoObjectKeyBuilder.profilOriginal(clientId);
    }

    /**
     * Staff (admin / gestionnaire / secretary), recovery managers and similar non-promoter
     * profiles see all clients. Promoters are limited to their portfolio even if they hold
     * ROLE_CONSULT_CLIENT (assigned to the PROMOTER profile by default).
     */
    static boolean hasGlobalPhotoAccess(User user) {
        if (user == null) {
            return false;
        }
        return !AppNotificationService.isPromoterOnly(user);
    }

    static boolean isInPortfolio(String username, Client client) {
        return ClientCommercialPredicates.matches(
                username,
                client.getCollector(),
                client.getTontineCollector(),
                client.getAgencyCollector(),
                client.getRecoveryCollector());
    }

    /** Clears the in-memory cache (tests). */
    void clearCache() {
        urlCache.clear();
    }

    Map<String, CachedUrl> cacheView() {
        return urlCache;
    }

    record CachedUrl(String url, Instant expiresAt, Instant usableUntil) {
    }
}
