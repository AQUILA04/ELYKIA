package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogBatchRequest;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogDto;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogEventDto;
import com.optimize.elykia.core.entity.customer.CustomerActivityLog;
import com.optimize.elykia.core.repository.customer.CustomerActivityLogRepository;
import com.optimize.elykia.core.util.PhoneNormalizer;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerActivityLogService {

    public static final String SOURCE_CLIENT_APP = "CLIENT_APP";
    public static final String SOURCE_SERVER = "SERVER";
    public static final int MAX_BATCH = 50;

    private final CustomerActivityLogRepository repository;
    private final JwtUtils jwtUtils;
    private final CustomerContextService contextService;

    @Value("${elykia.customer.activity-log.retention-days:180}")
    private int retentionDays;

    @Transactional
    public int ingestClientBatch(CustomerActivityLogBatchRequest request, String authorizationHeader) {
        if (request == null || request.getEvents() == null || request.getEvents().isEmpty()) {
            return 0;
        }
        if (request.getEvents().size() > MAX_BATCH) {
            throw new CustomValidationException("Lot d'événements trop volumineux (max " + MAX_BATCH + ").");
        }

        Long authenticatedClientId = resolveClientIdFromBearer(authorizationHeader);
        String ip = currentIp();
        String userAgent = currentUserAgent();

        List<UUID> ids = request.getEvents().stream()
                .map(CustomerActivityLogEventDto::getEventId)
                .filter(Objects::nonNull)
                .toList();
        Set<UUID> existing = ids.isEmpty()
                ? new HashSet<>()
                : new HashSet<>(repository.findExistingEventIds(ids));

        List<CustomerActivityLog> toSave = new ArrayList<>();
        Instant now = Instant.now();
        for (CustomerActivityLogEventDto dto : request.getEvents()) {
            if (dto.getEventId() == null || existing.contains(dto.getEventId())) {
                continue;
            }
            CustomerActivityLog entity = mapClientEvent(dto, authenticatedClientId, ip, userAgent, now);
            toSave.add(entity);
            existing.add(dto.getEventId());
        }
        if (!toSave.isEmpty()) {
            repository.saveAll(toSave);
        }
        return toSave.size();
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void recordServerEvent(String category, String eventType, String phone, Long clientId,
                                  String message, Map<String, Object> metadata) {
        try {
            CustomerActivityLog entity = new CustomerActivityLog();
            entity.setEventId(UUID.randomUUID());
            entity.setOccurredAt(Instant.now());
            entity.setReceivedAt(Instant.now());
            entity.setSource(SOURCE_SERVER);
            entity.setCategory(truncate(category, 40));
            entity.setEventType(truncate(eventType, 80));
            entity.setPhone(normalizePhone(phone));
            entity.setClientId(clientId);
            entity.setMessage(truncate(message, 1000));
            entity.setMetadata(sanitizeMetadata(metadata));
            entity.setIp(currentIp());
            entity.setUserAgent(truncate(currentUserAgent(), 512));
            entity.setDeviceId(currentHeader("X-Elykia-Device-Id"));
            entity.setSessionId(currentHeader("X-Elykia-Session-Id"));
            entity.setPlatform(currentHeader("X-Elykia-Platform"));
            entity.setAppVersion(currentHeader("X-Elykia-App-Version"));
            repository.save(entity);
        } catch (Exception e) {
            log.warn("Failed to record server activity event {}: {}", eventType, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<CustomerActivityLogDto> search(Long clientId, String phone, String deviceId,
                                               String sessionId, Instant from, Instant to,
                                               Pageable pageable) {
        String normalizedPhone = StringUtils.hasText(phone) ? PhoneNormalizer.toUsername(phone) : null;
        return repository.search(clientId, normalizedPhone, deviceId, sessionId, from, to, pageable)
                .map(this::toDto);
    }

    @Transactional
    public int purgeExpired() {
        Instant cutoff = Instant.now().minusSeconds(retentionDays * 24L * 3600L);
        return repository.deleteOlderThan(cutoff);
    }

    private CustomerActivityLog mapClientEvent(CustomerActivityLogEventDto dto, Long authenticatedClientId,
                                               String ip, String userAgent, Instant now) {
        CustomerActivityLog entity = new CustomerActivityLog();
        entity.setEventId(dto.getEventId());
        entity.setOccurredAt(parseInstant(dto.getOccurredAt(), now));
        entity.setReceivedAt(now);
        entity.setSource(SOURCE_CLIENT_APP);
        entity.setCategory(truncate(dto.getCategory(), 40));
        entity.setEventType(truncate(dto.getEventType(), 80));
        // Anti-usurpation : clientId uniquement depuis le JWT valide
        entity.setClientId(authenticatedClientId);
        entity.setPhone(normalizePhone(dto.getPhone()));
        entity.setDeviceId(truncate(dto.getDeviceId(), 64));
        entity.setSessionId(truncate(dto.getSessionId(), 64));
        entity.setPlatform(truncate(dto.getPlatform(), 20));
        entity.setAppVersion(truncate(dto.getAppVersion(), 40));
        entity.setScreen(truncate(dto.getScreen(), 200));
        entity.setHttpStatus(dto.getHttpStatus());
        entity.setMessage(truncate(dto.getMessage(), 1000));
        entity.setMetadata(sanitizeMetadata(dto.getMetadata()));
        entity.setIp(ip);
        entity.setUserAgent(truncate(userAgent, 512));
        return entity;
    }

    private Long resolveClientIdFromBearer(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authorizationHeader.substring(7).trim();
        if (!jwtUtils.validateJwtToken(token)) {
            return null;
        }
        try {
            String username = jwtUtils.getUserNameFromJwtToken(token);
            return contextService.findClientIdOptional(username).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private CustomerActivityLogDto toDto(CustomerActivityLog e) {
        return CustomerActivityLogDto.builder()
                .id(e.getId())
                .eventId(e.getEventId())
                .occurredAt(e.getOccurredAt())
                .receivedAt(e.getReceivedAt())
                .source(e.getSource())
                .category(e.getCategory())
                .eventType(e.getEventType())
                .clientId(e.getClientId())
                .phone(e.getPhone())
                .deviceId(e.getDeviceId())
                .sessionId(e.getSessionId())
                .platform(e.getPlatform())
                .appVersion(e.getAppVersion())
                .screen(e.getScreen())
                .httpStatus(e.getHttpStatus())
                .message(e.getMessage())
                .metadata(e.getMetadata())
                .ip(e.getIp())
                .userAgent(e.getUserAgent())
                .build();
    }

    private static Instant parseInstant(String raw, Instant fallback) {
        if (!StringUtils.hasText(raw)) {
            return fallback;
        }
        try {
            return Instant.parse(raw);
        } catch (DateTimeParseException e) {
            return fallback;
        }
    }

    private static String normalizePhone(String phone) {
        if (!StringUtils.hasText(phone)) {
            return null;
        }
        try {
            return truncate(PhoneNormalizer.toUsername(phone), 30);
        } catch (Exception e) {
            return truncate(phone, 30);
        }
    }

    private static Map<String, Object> sanitizeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : metadata.entrySet()) {
            String key = entry.getKey();
            if (key == null) {
                continue;
            }
            String lower = key.toLowerCase(Locale.ROOT);
            if (lower.contains("pin") || lower.contains("otp") || lower.contains("token")
                    || lower.contains("password") || lower.contains("secret")
                    || lower.contains("photo") || lower.equals("code")) {
                continue;
            }
            Object value = entry.getValue();
            if (value instanceof String s && s.length() > 500) {
                out.put(truncate(key, 80), s.substring(0, 100) + "…[truncated]");
            } else {
                out.put(truncate(key, 80), value);
            }
        }
        return out.isEmpty() ? null : out;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= max) {
            return trimmed;
        }
        return trimmed.substring(0, max);
    }

    private static HttpServletRequest currentRequest() {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sra) {
            return sra.getRequest();
        }
        return null;
    }

    private static String currentIp() {
        HttpServletRequest req = currentRequest();
        if (req == null) {
            return null;
        }
        String forwarded = req.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            return truncate(forwarded.split(",")[0].trim(), 64);
        }
        return truncate(req.getRemoteAddr(), 64);
    }

    private static String currentUserAgent() {
        HttpServletRequest req = currentRequest();
        return req == null ? null : req.getHeader("User-Agent");
    }

    private static String currentHeader(String name) {
        HttpServletRequest req = currentRequest();
        return req == null ? null : truncate(req.getHeader(name), 64);
    }
}
