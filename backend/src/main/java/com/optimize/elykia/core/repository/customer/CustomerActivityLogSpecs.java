package com.optimize.elykia.core.repository.customer;

import com.optimize.elykia.core.dto.customer.CustomerActivityLogSearchCriteria;
import com.optimize.elykia.core.entity.customer.CustomerActivityLog;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class CustomerActivityLogSpecs {

    private CustomerActivityLogSpecs() {
    }

    public static Specification<CustomerActivityLog> fromCriteria(CustomerActivityLogSearchCriteria c) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (c.getClientId() != null) {
                predicates.add(cb.equal(root.get("clientId"), c.getClientId()));
            }
            if (StringUtils.hasText(c.getPhone())) {
                predicates.add(cb.equal(root.get("phone"), c.getPhone()));
            }
            if (StringUtils.hasText(c.getDeviceId())) {
                predicates.add(cb.equal(root.get("deviceId"), c.getDeviceId()));
            }
            if (StringUtils.hasText(c.getSessionId())) {
                predicates.add(cb.equal(root.get("sessionId"), c.getSessionId()));
            }
            if (c.getFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), c.getFrom()));
            }
            if (c.getTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), c.getTo()));
            }
            if (StringUtils.hasText(c.getCategory())) {
                predicates.add(cb.equal(root.get("category"), c.getCategory()));
            }
            if (StringUtils.hasText(c.getSource())) {
                predicates.add(cb.equal(root.get("source"), c.getSource()));
            }
            if (StringUtils.hasText(c.getPlatform())) {
                predicates.add(cb.equal(root.get("platform"), c.getPlatform()));
            }
            if (StringUtils.hasText(c.getAppVersion())) {
                predicates.add(cb.equal(root.get("appVersion"), c.getAppVersion()));
            }
            if (c.getHttpStatus() != null) {
                predicates.add(cb.equal(root.get("httpStatus"), c.getHttpStatus()));
            }
            if (c.getHttpStatusFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("httpStatus"), c.getHttpStatusFrom()));
            }
            if (c.getHttpStatusTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("httpStatus"), c.getHttpStatusTo()));
            }
            if (c.getEventTypes() != null && !c.getEventTypes().isEmpty()) {
                predicates.add(root.get("eventType").in(c.getEventTypes()));
            }
            if (StringUtils.hasText(c.getQ())) {
                String pattern = "%" + c.getQ().trim().toLowerCase(Locale.ROOT) + "%";
                Predicate onMessage = cb.like(cb.lower(root.get("message")), pattern);
                Predicate onScreen = cb.like(cb.lower(root.get("screen")), pattern);
                predicates.add(cb.or(onMessage, onScreen));
            }
            if (StringUtils.hasText(c.getOutcome())) {
                String outcome = c.getOutcome().trim().toUpperCase(Locale.ROOT);
                switch (outcome) {
                    case "SUCCESS" -> predicates.add(cb.or(
                            cb.like(root.get("eventType"), "%_SUCCESS"),
                            root.get("eventType").in(List.of(
                                    "OTP_SENT", "OTP_VERIFIED", "LOGIN_SUCCESS", "PIN_SETUP",
                                    "REGISTER", "CHECK_PHONE", "ORDER_SUBMITTED",
                                    "MM_PAYMENT_SUBMITTED", "TONTINE_JOIN", "TONTINE_PAYMENT_SUBMITTED"
                            ))
                    ));
                    case "FAILURE" -> predicates.add(cb.or(
                            cb.equal(root.get("category"), "ERROR"),
                            cb.like(root.get("eventType"), "%_FAILED"),
                            cb.like(root.get("eventType"), "%FAILED"),
                            root.get("eventType").in(List.of("LOGIN_FAILED", "OTP_FAILED", "OTP_SEND_FAILED",
                                    "HTTP_ERROR", "APP_ERROR", "UNHANDLED_REJECTION", "SESSION_EXPIRED",
                                    "ORDER_FAILED", "MM_PAYMENT_FAILED"))
                    ));
                    case "INFO" -> predicates.add(cb.and(
                            cb.notEqual(root.get("category"), "ERROR"),
                            cb.notLike(root.get("eventType"), "%_FAILED"),
                            cb.notLike(root.get("eventType"), "%_SUCCESS"),
                            cb.not(root.get("eventType").in(List.of(
                                    "LOGIN_FAILED", "OTP_FAILED", "OTP_SEND_FAILED",
                                    "HTTP_ERROR", "APP_ERROR", "UNHANDLED_REJECTION",
                                    "LOGIN_SUCCESS", "OTP_SENT", "OTP_VERIFIED"
                            )))
                    ));
                    default -> {
                        // ignore unknown outcome
                    }
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
