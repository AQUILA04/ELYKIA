package com.optimize.elykia.core.listener;

import com.optimize.elykia.core.event.CarnetEcartDetectedEvent;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Écrit les notifications d'écart après le commit du contrôle.
 * Un échec ici ne revient pas à l'appelant : le contrôle est déjà enregistré.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CarnetEcartNotificationListener {

    private final AppNotificationService appNotificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCarnetEcartDetected(CarnetEcartDetectedEvent event) {
        if (event == null || event.getItems() == null || event.getItems().isEmpty()) {
            return;
        }
        for (CarnetEcartDetectedEvent.Item item : event.getItems()) {
            try {
                appNotificationService.notifyCarnetEcart(
                        item.getCommercialUsername(),
                        item.getClientName(),
                        item.getControlId(),
                        item.getReferenceKey(),
                        item.getAmount());
            } catch (RuntimeException ex) {
                log.warn("Notification d'écart de carnet non envoyée pour le contrôle {} ({}) : {}",
                        item.getControlId(), item.getReferenceKey(), ex.getMessage());
            }
        }
    }
}
