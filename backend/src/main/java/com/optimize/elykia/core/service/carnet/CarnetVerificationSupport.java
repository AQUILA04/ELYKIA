package com.optimize.elykia.core.service.carnet;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.BulkCarnetVerificationResultDto;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.function.Consumer;

/**
 * Shared helpers for credit / tontine carnet verification flows.
 */
public final class CarnetVerificationSupport {

    public static final int MAX_BULK = 500;

    private CarnetVerificationSupport() {
    }

    public static void apply(CarnetVerifiable target, boolean verified, String username, LocalDateTime now) {
        if (verified) {
            if (Boolean.TRUE.equals(target.getCarnetVerified())) {
                return;
            }
            target.setCarnetVerified(true);
            target.setCarnetVerifiedAt(now);
            target.setCarnetVerifiedBy(username);
            return;
        }
        target.setCarnetVerified(false);
        target.setCarnetVerifiedAt(null);
        target.setCarnetVerifiedBy(null);
    }

    public static String requireCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new CustomValidationException("Utilisateur non authentifié.");
        }
        return authentication.getName();
    }

    public static void requireBulkMarkOnly(boolean verified) {
        if (!verified) {
            throw new CustomValidationException(
                    "La vérification en masse ne peut que marquer les carnets, pas les décocher.");
        }
    }

    public static void requireBulkIds(List<Long> ids, String emptyMessage, String maxMessage) {
        if (ids == null || ids.isEmpty()) {
            throw new CustomValidationException(emptyMessage);
        }
        if (ids.size() > MAX_BULK) {
            throw new CustomValidationException(maxMessage);
        }
    }

    public static <T extends CarnetVerifiable> void assertAllFound(
            List<T> loaded,
            List<Long> requestedIds,
            String notFoundKey
    ) {
        if (loaded.size() != new HashSet<>(requestedIds).size()) {
            throw new ResourceNotFoundException(notFoundKey);
        }
    }

    public static <T extends CarnetVerifiable> BulkCarnetVerificationResultDto bulkApply(
            List<T> entities,
            List<Long> requestedIds,
            boolean verified,
            Consumer<T> assertWritable,
            Consumer<Iterable<T>> saveAll
    ) {
        String username = requireCurrentUsername();
        LocalDateTime now = LocalDateTime.now();
        int updated = 0;
        int skipped = 0;
        for (T entity : entities) {
            assertWritable.accept(entity);
            if (Boolean.TRUE.equals(entity.getCarnetVerified()) == verified) {
                skipped++;
                continue;
            }
            apply(entity, verified, username, now);
            updated++;
        }
        saveAll.accept(entities);
        return new BulkCarnetVerificationResultDto(updated, skipped, requestedIds.size());
    }
}
