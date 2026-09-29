package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogBatchRequest;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogDto;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogEventDto;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogSearchCriteria;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogSummaryDto;
import com.optimize.elykia.core.entity.customer.CustomerActivityLog;
import com.optimize.elykia.core.repository.customer.CustomerActivityLogRepository;
import com.optimize.elykia.core.repository.customer.CustomerActivityLogSpecs;
import com.optimize.elykia.core.util.PhoneNormalizer;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
    private final EntityManager entityManager;

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
        return search(CustomerActivityLogSearchCriteria.builder()
                .clientId(clientId)
                .phone(StringUtils.hasText(phone) ? PhoneNormalizer.toUsername(phone) : null)
                .deviceId(deviceId)
                .sessionId(sessionId)
                .from(from)
                .to(to)
                .build(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<CustomerActivityLogDto> search(CustomerActivityLogSearchCriteria criteria, Pageable pageable) {
        CustomerActivityLogSearchCriteria normalized = normalize(criteria);
        return repository.findAll(CustomerActivityLogSpecs.fromCriteria(normalized), pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<CustomerActivityLogDto> sessionTimeline(String sessionId, Instant from, Instant to, int limit) {
        if (!StringUtils.hasText(sessionId)) {
            return List.of();
        }
        int capped = Math.min(Math.max(limit, 1), 500);
        return repository.findSessionTimeline(sessionId.trim(), from, to, PageRequest.of(0, capped))
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerActivityLogSummaryDto summarize(CustomerActivityLogSearchCriteria criteria) {
        CustomerActivityLogSearchCriteria normalized = normalize(criteria);
        Specification<CustomerActivityLog> base = CustomerActivityLogSpecs.fromCriteria(normalized);

        long totalEvents = repository.count(base);
        long errorCount = repository.count(base.and(
                (root, q, cb) -> cb.equal(root.get("category"), "ERROR")));
        long authFailureCount = repository.count(base.and(
                (root, q, cb) -> root.get("eventType").in(
                        List.of("LOGIN_FAILED", "OTP_FAILED", "OTP_SEND_FAILED"))));
        long loginSuccessCount = repository.count(base.and(
                (root, q, cb) -> cb.equal(root.get("eventType"), "LOGIN_SUCCESS")));

        return CustomerActivityLogSummaryDto.builder()
                .from(normalized.getFrom())
                .to(normalized.getTo())
                .totalEvents(totalEvents)
                .errorCount(errorCount)
                .authFailureCount(authFailureCount)
                .loginSuccessCount(loginSuccessCount)
                .uniqueClients(countDistinct(base, "clientId"))
                .uniqueDevices(countDistinct(base, "deviceId"))
                .uniqueSessions(countDistinct(base, "sessionId"))
                .byCategory(groupCount(base, "category"))
                .bySource(groupCount(base, "source"))
                .byPlatform(groupCount(base, "platform"))
                .topEventTypes(topNamed(base, "eventType", 10))
                .topHttpPaths(topHttpPaths(base, 10))
                .byAppVersion(appVersionStats(base, 15))
                .build();
    }

    private CustomerActivityLogSearchCriteria normalize(CustomerActivityLogSearchCriteria criteria) {
        if (criteria == null) {
            return CustomerActivityLogSearchCriteria.builder().build();
        }
        String phone = criteria.getPhone();
        String normalizedPhone = StringUtils.hasText(phone) ? PhoneNormalizer.toUsername(phone) : null;
        List<String> eventTypes = criteria.getEventTypes() == null || criteria.getEventTypes().isEmpty()
                ? null
                : criteria.getEventTypes().stream().filter(StringUtils::hasText).map(String::trim).toList();
        return CustomerActivityLogSearchCriteria.builder()
                .clientId(criteria.getClientId())
                .phone(normalizedPhone)
                .deviceId(blankToNull(criteria.getDeviceId()))
                .sessionId(blankToNull(criteria.getSessionId()))
                .from(criteria.getFrom())
                .to(criteria.getTo())
                .category(blankToNull(criteria.getCategory()))
                .source(blankToNull(criteria.getSource()))
                .platform(blankToNull(criteria.getPlatform()))
                .appVersion(blankToNull(criteria.getAppVersion()))
                .httpStatus(criteria.getHttpStatus())
                .httpStatusFrom(criteria.getHttpStatusFrom())
                .httpStatusTo(criteria.getHttpStatusTo())
                .q(blankToNull(criteria.getQ()))
                .outcome(blankToNull(criteria.getOutcome()))
                .eventTypes(eventTypes)
                .build();
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private long countDistinct(Specification<CustomerActivityLog> base, String field) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<CustomerActivityLog> root = cq.from(CustomerActivityLog.class);
        cq.select(cb.countDistinct(root.get(field)));
        Predicate pred = base.toPredicate(root, cq, cb);
        Predicate notNull = cb.isNotNull(root.get(field));
        cq.where(pred == null ? notNull : cb.and(pred, notNull));
        Long result = entityManager.createQuery(cq).getSingleResult();
        return result == null ? 0L : result;
    }

    private Map<String, Long> groupCount(Specification<CustomerActivityLog> base, String field) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
        Root<CustomerActivityLog> root = cq.from(CustomerActivityLog.class);
        cq.multiselect(root.get(field), cb.count(root));
        Predicate pred = base.toPredicate(root, cq, cb);
        Predicate notNull = cb.isNotNull(root.get(field));
        cq.where(pred == null ? notNull : cb.and(pred, notNull));
        cq.groupBy(root.get(field));
        Map<String, Long> out = new LinkedHashMap<>();
        for (Object[] row : entityManager.createQuery(cq).getResultList()) {
            if (row[0] != null) {
                out.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
            }
        }
        return out;
    }

    private List<CustomerActivityLogSummaryDto.NamedCount> topNamed(
            Specification<CustomerActivityLog> base, String field, int limit) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
        Root<CustomerActivityLog> root = cq.from(CustomerActivityLog.class);
        var countExpr = cb.count(root);
        cq.multiselect(root.get(field), countExpr);
        Predicate pred = base.toPredicate(root, cq, cb);
        Predicate notNull = cb.isNotNull(root.get(field));
        cq.where(pred == null ? notNull : cb.and(pred, notNull));
        cq.groupBy(root.get(field));
        cq.orderBy(cb.desc(countExpr));
        return entityManager.createQuery(cq)
                .setMaxResults(limit)
                .getResultList()
                .stream()
                .map(row -> CustomerActivityLogSummaryDto.NamedCount.builder()
                        .name(String.valueOf(row[0]))
                        .count(((Number) row[1]).longValue())
                        .build())
                .toList();
    }

    private List<CustomerActivityLogSummaryDto.NamedCount> topHttpPaths(
            Specification<CustomerActivityLog> base, int limit) {
        Specification<CustomerActivityLog> httpErrors = base.and(
                (root, q, cb) -> cb.equal(root.get("eventType"), "HTTP_ERROR"));
        // Best-effort: count by message prefix when metadata path is unavailable via Criteria JSON.
        return topNamed(httpErrors, "message", limit);
    }

    private List<CustomerActivityLogSummaryDto.AppVersionStats> appVersionStats(
            Specification<CustomerActivityLog> base, int limit) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
        Root<CustomerActivityLog> root = cq.from(CustomerActivityLog.class);
        var countExpr = cb.count(root);
        cq.multiselect(root.get("appVersion"), countExpr);
        Predicate pred = base.toPredicate(root, cq, cb);
        cq.where(pred);
        cq.groupBy(root.get("appVersion"));
        cq.orderBy(cb.desc(countExpr));
        List<Object[]> rows = entityManager.createQuery(cq).setMaxResults(limit).getResultList();
        List<CustomerActivityLogSummaryDto.AppVersionStats> out = new ArrayList<>();
        for (Object[] row : rows) {
            String version = row[0] == null ? "(inconnu)" : String.valueOf(row[0]);
            long count = ((Number) row[1]).longValue();
            Specification<CustomerActivityLog> versionSpec = base.and((r, q, c) -> {
                if (row[0] == null) {
                    return c.isNull(r.get("appVersion"));
                }
                return c.equal(r.get("appVersion"), row[0]);
            }).and((r, q, c) -> c.equal(r.get("category"), "ERROR"));
            long errorCount = repository.count(versionSpec);
            out.add(CustomerActivityLogSummaryDto.AppVersionStats.builder()
                    .appVersion(version)
                    .count(count)
                    .errorCount(errorCount)
                    .build());
        }
        return out;
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
