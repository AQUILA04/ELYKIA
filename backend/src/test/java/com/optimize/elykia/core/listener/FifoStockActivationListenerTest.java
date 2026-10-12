package com.optimize.elykia.core.listener;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.event.ParameterUpdatedEvent;
import com.optimize.elykia.core.service.stock.FifoStockActivationService;
import com.optimize.elykia.core.service.stock.StockValuationFacade;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FifoStockActivationListenerTest {

    @Mock
    private FifoStockActivationService fifoStockActivationService;

    @InjectMocks
    private FifoStockActivationListener listener;

    @Test
    void ignoresOtherParameters() {
        listener.onParameterUpdated(new ParameterUpdatedEvent(this, "OTHER_KEY", "false", "true"));

        verify(fifoStockActivationService, never()).activate();
    }

    @Test
    void activatesOnFalseToTrue() {
        when(fifoStockActivationService.activate()).thenReturn(Map.of("migratedArticles", 1));

        listener.onParameterUpdated(new ParameterUpdatedEvent(
                this, StockValuationFacade.FIFO_FLAG_KEY, "false", "true"));

        verify(fifoStockActivationService).activate();
    }

    @Test
    void activatesOnCreateAsTrue() {
        when(fifoStockActivationService.activate()).thenReturn(Map.of("migratedArticles", 0));

        listener.onParameterUpdated(new ParameterUpdatedEvent(
                this, StockValuationFacade.FIFO_FLAG_KEY, null, "true"));

        verify(fifoStockActivationService).activate();
    }

    @Test
    void refusesTrueToFalse() {
        assertThrows(CustomValidationException.class, () ->
                listener.onParameterUpdated(new ParameterUpdatedEvent(
                        this, StockValuationFacade.FIFO_FLAG_KEY, "true", "false")));

        verify(fifoStockActivationService, never()).activate();
    }

    @Test
    void ignoresTrueToTrue() {
        listener.onParameterUpdated(new ParameterUpdatedEvent(
                this, StockValuationFacade.FIFO_FLAG_KEY, "true", "true"));

        verify(fifoStockActivationService, never()).activate();
    }
}
