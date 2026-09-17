package com.optimize.elykia.core.service.customer;

import com.optimize.common.securities.models.User;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Shared helpers for customer Mobile Money submission admin services (credit + tontine).
 */
final class SubmissionAdminSupport {

    private SubmissionAdminSupport() {
    }

    static Map<Long, Client> loadClientsById(ClientService clientService, List<Long> clientIds) {
        return clientIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .map(id -> {
                    try {
                        return clientService.getById(id);
                    } catch (Exception ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Client::getId, Function.identity(), (a, b) -> a));
    }

    static <T> Page<T> pageForAudience(User user, List<T> filtered, Pageable pageable, long totalWhenStaff) {
        if (AppNotificationService.isPromoterOnly(user)) {
            return new PageImpl<>(filtered, pageable, filtered.size());
        }
        return new PageImpl<>(filtered, pageable, totalWhenStaff);
    }
}
