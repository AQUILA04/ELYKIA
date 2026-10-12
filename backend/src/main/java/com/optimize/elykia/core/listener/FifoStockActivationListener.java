package com.optimize.elykia.core.listener;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.event.ParameterUpdatedEvent;
import com.optimize.elykia.core.service.stock.FifoStockActivationService;
import com.optimize.elykia.core.service.stock.StockValuationFacade;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class FifoStockActivationListener {

    private final FifoStockActivationService fifoStockActivationService;

    @EventListener
    public void onParameterUpdated(ParameterUpdatedEvent event) {
        if (!StockValuationFacade.FIFO_FLAG_KEY.equals(event.getKey())) {
            return;
        }

        boolean wasEnabled = Boolean.parseBoolean(event.getOldValue());
        boolean isEnabled = Boolean.parseBoolean(event.getNewValue());

        if (wasEnabled && !isEnabled) {
            throw new CustomValidationException(
                    "La désactivation de ENABLED_FIFO_STOCK_VALUATION n'est pas supportée : "
                            + "les lots FIFO resteraient désynchronisés des mouvements de stock.");
        }

        if (!wasEnabled && isEnabled) {
            log.info("Activation FIFO demandée via paramètre : création des lots d'ouverture");
            fifoStockActivationService.activate();
        }
    }
}
