package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.entity.stock.StockTontineRequestDeliveryLink;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.event.TontineStockRequestValidatedEvent;
import com.optimize.elykia.core.repository.StockTontineRequestDeliveryLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TontineStockRequestValidatedListener {

    private final StockTontineRequestDeliveryLinkRepository linkRepository;
    private final TontineDeliveryService deliveryService;

    @EventListener
    public void onStockRequestValidated(TontineStockRequestValidatedEvent event) {
        if (event == null || event.getStockTontineRequestId() == null) {
            return;
        }
        List<Long> pendingIds = linkRepository.findByStockRequestId(event.getStockTontineRequestId()).stream()
                .map(StockTontineRequestDeliveryLink::getDelivery)
                .filter(delivery -> delivery != null
                        && delivery.getTontineMember() != null
                        && delivery.getTontineMember().getDeliveryStatus() == TontineMemberDeliveryStatus.PENDING)
                .map(TontineDelivery::getId)
                .distinct()
                .toList();
        if (pendingIds.isEmpty()) {
            log.debug("Aucune livraison PENDING liée à la demande tontine {}", event.getStockTontineRequestId());
            return;
        }
        deliveryService.validateStillPending(pendingIds);
        log.info("Livraisons {} passées en VALIDATED suite à la validation de la demande tontine {}",
                pendingIds, event.getStockTontineRequestId());
    }
}
