package com.optimize.elykia.core.service;

import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.CreditPaymentEvent;
import com.optimize.elykia.core.repository.CreditPaymentEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditPaymentEventServiceTest {

    @Mock
    private CreditPaymentEventRepository paymentEventRepository;

    @InjectMocks
    private CreditPaymentEventService paymentEventService;

    private Credit credit;

    @BeforeEach
    void setUp() {
        credit = new Credit();
        credit.setId(1L);
        credit.setDailyStake(3000.0);
    }

    @Test
    void testRecordPayment_FirstPayment() {
        // Given
        when(paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(1L))
            .thenReturn(Collections.emptyList());
        when(paymentEventRepository.save(any(CreditPaymentEvent.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CreditPaymentEvent event = paymentEventService.recordPayment(credit, 3000.0, "CASH");

        // Then
        assertNotNull(event);
        assertEquals(credit, event.getCredit());
        assertEquals(3000.0, event.getAmount());
        assertEquals("CASH", event.getPaymentMethod());
        assertEquals(0, event.getDaysFromLastPayment());
        assertTrue(event.getIsOnTime());
        verify(paymentEventRepository).save(any(CreditPaymentEvent.class));
    }

    @Test
    void testRecordPayment_SecondPayment_OnTime() {
        // Given
        CreditPaymentEvent previousEvent = new CreditPaymentEvent();
        previousEvent.setPaymentDate(LocalDateTime.now().minusDays(1));
        
        when(paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(1L))
            .thenReturn(Arrays.asList(previousEvent));
        when(paymentEventRepository.save(any(CreditPaymentEvent.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CreditPaymentEvent event = paymentEventService.recordPayment(credit, 3000.0, "CASH");

        // Then
        assertNotNull(event);
        assertEquals(1, event.getDaysFromLastPayment());
        assertTrue(event.getIsOnTime()); // 1 jour <= 1 jour attendu + 2 jours de tolérance
    }

    @Test
    void testRecordPayment_SecondPayment_Late() {
        // Given
        CreditPaymentEvent previousEvent = new CreditPaymentEvent();
        previousEvent.setPaymentDate(LocalDateTime.now().minusDays(10));
        
        when(paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(1L))
            .thenReturn(Arrays.asList(previousEvent));
        when(paymentEventRepository.save(any(CreditPaymentEvent.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        CreditPaymentEvent event = paymentEventService.recordPayment(credit, 3000.0, "MOBILE_MONEY");

        // Then
        assertNotNull(event);
        assertEquals(10, event.getDaysFromLastPayment());
        assertFalse(event.getIsOnTime()); // 10 jours > 1 jour attendu + 2 jours de tolérance
        assertEquals("MOBILE_MONEY", event.getPaymentMethod());
    }

    @Test
    void testCalculatePaymentRegularityScore_NoPayments() {
        // Given
        when(paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(1L))
            .thenReturn(Collections.emptyList());

        // When
        Double score = paymentEventService.calculatePaymentRegularityScore(1L);

        // Then
        assertEquals(0.0, score);
    }

    @Test
    void testCalculatePaymentRegularityScore_AllOnTime() {
        // Given
        CreditPaymentEvent event1 = createPaymentEvent(true);
        CreditPaymentEvent event2 = createPaymentEvent(true);
        CreditPaymentEvent event3 = createPaymentEvent(true);
        
        when(paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(1L))
            .thenReturn(Arrays.asList(event1, event2, event3));

        // When
        Double score = paymentEventService.calculatePaymentRegularityScore(1L);

        // Then
        assertEquals(100.0, score);
    }

    @Test
    void testCalculatePaymentRegularityScore_PartiallyOnTime() {
        // Given
        CreditPaymentEvent event1 = createPaymentEvent(true);
        CreditPaymentEvent event2 = createPaymentEvent(false);
        CreditPaymentEvent event3 = createPaymentEvent(true);
        CreditPaymentEvent event4 = createPaymentEvent(true);
        
        when(paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(1L))
            .thenReturn(Arrays.asList(event1, event2, event3, event4));

        // When
        Double score = paymentEventService.calculatePaymentRegularityScore(1L);

        // Then
        assertEquals(75.0, score); // 3 sur 4 = 75%
    }

    @Test
    void testGetPaymentHistory() {
        // Given
        List<CreditPaymentEvent> events = Arrays.asList(
            createPaymentEvent(true),
            createPaymentEvent(true),
            createPaymentEvent(false)
        );
        when(paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(1L))
            .thenReturn(events);

        // When
        List<CreditPaymentEvent> history = paymentEventService.getPaymentHistory(1L);

        // Then
        assertNotNull(history);
        assertEquals(3, history.size());
    }

    private CreditPaymentEvent createPaymentEvent(boolean isOnTime) {
        CreditPaymentEvent event = new CreditPaymentEvent();
        event.setIsOnTime(isOnTime);
        event.setPaymentDate(LocalDateTime.now());
        event.setAmount(3000.0);
        return event;
    }
}
