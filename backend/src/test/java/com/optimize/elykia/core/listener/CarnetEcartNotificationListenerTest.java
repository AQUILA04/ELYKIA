package com.optimize.elykia.core.listener;

import com.optimize.elykia.core.event.CarnetEcartDetectedEvent;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CarnetEcartNotificationListenerTest {

    @Mock
    private AppNotificationService appNotificationService;

    @InjectMocks
    private CarnetEcartNotificationListener listener;

    @Test
    void ignoresEmptyEvent() {
        listener.onCarnetEcartDetected(new CarnetEcartDetectedEvent(List.of()));

        verify(appNotificationService, never()).notifyCarnetEcart(any(), any(), any(), any(), anyDouble());
    }

    @Test
    void continuesAfterAFailedNotification() {
        CarnetEcartDetectedEvent.Item failed = item("COM003", 10L, "TONTINE:COM003");
        CarnetEcartDetectedEvent.Item next = item("COM015", 10L, "TONTINE:COM015");
        doThrow(new RuntimeException("contrainte"))
                .when(appNotificationService)
                .notifyCarnetEcart(eq("COM003"), any(), eq(10L), eq("TONTINE:COM003"), anyDouble());

        listener.onCarnetEcartDetected(new CarnetEcartDetectedEvent(List.of(failed, next)));

        verify(appNotificationService).notifyCarnetEcart(eq("COM003"), any(), eq(10L), eq("TONTINE:COM003"), anyDouble());
        verify(appNotificationService).notifyCarnetEcart(eq("COM015"), any(), eq(10L), eq("TONTINE:COM015"), anyDouble());
    }

    private static CarnetEcartDetectedEvent.Item item(String commercial, Long controlId, String referenceKey) {
        return new CarnetEcartDetectedEvent.Item(commercial, "Client", controlId, referenceKey, 1_500d);
    }
}
