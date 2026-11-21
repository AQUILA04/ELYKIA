package com.optimize.elykia.notification.api;

import com.optimize.common.securities.models.User;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * Façade publique du module {@code notification} exposée aux autres Bounded Contexts.
 */
public interface AppNotificationFacade {

    void createPaymentDeclaration(PaymentDeclarationNotificationCommand command);

    void createCustomerOrder(CustomerOrderNotificationCommand command);

    void createTontinePaymentDeclaration(TontinePaymentDeclarationNotificationCommand command);

    void createFromCatchupEvent(TontineCatchupNotificationCommand command);

    void resolveByTypeAndEntityId(AppNotificationType type, Long entityId);

    void cancelCatchupByCollectionId(Long collectionId);

    void cancelUnresolvedByTypeAndEntityIds(AppNotificationType type, List<Long> entityIds);

    void notifyCarnetEcart(String commercialUsername, String clientName, Long controlId,
            String referenceKey, double amount);

    /**
     * Type-scoped PROMOTER audience:
     * <ul>
     *   <li>{@code PAYMENT_DECLARATION} / {@code CUSTOMER_ORDER} -> credit {@code targetCollector} only</li>
     *   <li>{@code TONTINE_CATCHUP} / {@code TONTINE_PAYMENT_DECLARATION} -> {@code tontineCollector} only (fallback {@code targetCollector})</li>
     *   <li>{@code CARNET_ECART} -> {@code targetCollector} only</li>
     * </ul>
     */
    static boolean matchesPromoterAudience(
            User user,
            AppNotificationType type,
            String targetCollector,
            String tontineCollector) {
        if (user == null || !StringUtils.hasText(user.getUsername()) || type == null) {
            return false;
        }
        String username = user.getUsername();
        return switch (type) {
            case PAYMENT_DECLARATION, CUSTOMER_ORDER ->
                    username.equalsIgnoreCase(targetCollector != null ? targetCollector : "");
            case TONTINE_CATCHUP, TONTINE_PAYMENT_DECLARATION -> {
                if (StringUtils.hasText(tontineCollector)) {
                    yield username.equalsIgnoreCase(tontineCollector);
                }
                yield username.equalsIgnoreCase(targetCollector != null ? targetCollector : "");
            }
            case CARNET_ECART -> username.equalsIgnoreCase(targetCollector != null ? targetCollector : "");
        };
    }
}
