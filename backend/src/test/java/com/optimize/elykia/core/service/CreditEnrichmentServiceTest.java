package com.optimize.elykia.core.service;

import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.RiskLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditEnrichmentServiceTest {

    @Mock
    private CreditPaymentEventService paymentEventService;

    @InjectMocks
    private CreditEnrichmentService enrichmentService;

    private Credit credit;

    @BeforeEach
    void setUp() {
        credit = new Credit();
        credit.setId(1L);
        credit.setTotalAmount(100000.0);
        credit.setTotalPurchase(70000.0);
        credit.setTotalAmountPaid(50000.0);
        credit.setBeginDate(LocalDate.now().minusDays(15));
        credit.setExpectedEndDate(LocalDate.now().plusDays(15));
        credit.setAccountingDate(LocalDate.now().minusDays(15));
        credit.setLateDaysCount(0);
    }

    @Test
    void testCalculateProfitMetrics() {
        // When
        enrichmentService.calculateProfitMetrics(credit);

        // Then
        assertEquals(30000.0, credit.getProfitMargin());
        assertEquals(42.857, credit.getProfitMarginPercentage(), 0.01);
    }

    @Test
    void testCalculateProfitMetricsWithZeroPurchase() {
        // Given
        credit.setTotalPurchase(0.0);

        // When
        enrichmentService.calculateProfitMetrics(credit);

        // Then
        assertEquals(100000.0, credit.getProfitMargin());
        assertNull(credit.getProfitMarginPercentage());
    }

    @Test
    void testCalculatePaymentMetrics() {
        // When
        enrichmentService.calculatePaymentMetrics(credit);

        // Then
        assertEquals(50.0, credit.getPaymentCompletionRate());
    }

    @Test
    void testCalculatePaymentMetricsWithRegularityScore() {
        // Given
        when(paymentEventService.calculatePaymentRegularityScore(1L)).thenReturn(85.0);

        // When
        enrichmentService.calculatePaymentMetrics(credit);

        // Then
        assertEquals(50.0, credit.getPaymentCompletionRate());
        assertEquals(85.0, credit.getPaymentRegularityScore());
    }

    @Test
    void testCalculateDurationMetrics() {
        // When
        enrichmentService.calculateDurationMetrics(credit);

        // Then
        assertEquals(30, credit.getExpectedDurationDays());
        assertNull(credit.getActualDurationDays());
    }

    @Test
    void testCalculateDurationMetricsWithEffectiveEndDate() {
        // Given
        credit.setEffectiveEndDate(LocalDate.now());

        // When
        enrichmentService.calculateDurationMetrics(credit);

        // Then
        assertEquals(30, credit.getExpectedDurationDays());
        assertEquals(15, credit.getActualDurationDays());
    }

    @Test
    void testCalculateRiskLevel_Low() {
        // Given
        credit.setLateDaysCount(0);
        credit.setPaymentCompletionRate(80.0);
        credit.setPaymentRegularityScore(90.0);

        // When
        enrichmentService.calculateRiskLevel(credit);

        // Then
        assertEquals(RiskLevel.LOW, credit.getRiskLevel());
    }

    @Test
    void testCalculateRiskLevel_Medium() {
        // Given
        credit.setLateDaysCount(5);
        credit.setPaymentCompletionRate(60.0);
        credit.setPaymentRegularityScore(65.0);

        // When
        enrichmentService.calculateRiskLevel(credit);

        // Then
        assertEquals(RiskLevel.MEDIUM, credit.getRiskLevel());
    }

    @Test
    void testCalculateRiskLevel_High() {
        // Given
        credit.setLateDaysCount(20);
        credit.setPaymentCompletionRate(40.0);
        credit.setPaymentRegularityScore(50.0);

        // When
        enrichmentService.calculateRiskLevel(credit);

        // Then
        assertEquals(RiskLevel.HIGH, credit.getRiskLevel());
    }

    @Test
    void testCalculateRiskLevel_Critical() {
        // Given
        credit.setLateDaysCount(35);
        credit.setPaymentCompletionRate(20.0);
        credit.setPaymentRegularityScore(30.0);
        credit.setTotalAmountRemaining(80000.0);
        credit.setExpectedEndDate(LocalDate.now().plusDays(5));

        // When
        enrichmentService.calculateRiskLevel(credit);

        // Then
        assertEquals(RiskLevel.CRITICAL, credit.getRiskLevel());
    }

    @Test
    void testCalculateSeasonPeriod_Q1() {
        // Given
        credit.setAccountingDate(LocalDate.of(2025, 2, 15));

        // When
        enrichmentService.calculateSeasonPeriod(credit);

        // Then
        assertEquals("Q1", credit.getSeasonPeriod());
    }

    @Test
    void testCalculateSeasonPeriod_Q2() {
        // Given
        credit.setAccountingDate(LocalDate.of(2025, 5, 15));

        // When
        enrichmentService.calculateSeasonPeriod(credit);

        // Then
        assertEquals("Q2", credit.getSeasonPeriod());
    }

    @Test
    void testCalculateSeasonPeriod_Q3() {
        // Given
        credit.setAccountingDate(LocalDate.of(2025, 8, 15));

        // When
        enrichmentService.calculateSeasonPeriod(credit);

        // Then
        assertEquals("Q3", credit.getSeasonPeriod());
    }

    @Test
    void testCalculateSeasonPeriod_Q4() {
        // Given
        credit.setAccountingDate(LocalDate.of(2025, 11, 15));

        // When
        enrichmentService.calculateSeasonPeriod(credit);

        // Then
        assertEquals("Q4", credit.getSeasonPeriod());
    }

    @Test
    void testEnrichCredit_Complete() {
        // Given
        when(paymentEventService.calculatePaymentRegularityScore(1L)).thenReturn(85.0);

        // When
        enrichmentService.enrichCredit(credit);

        // Then
        assertNotNull(credit.getProfitMargin());
        assertNotNull(credit.getProfitMarginPercentage());
        assertNotNull(credit.getPaymentCompletionRate());
        assertNotNull(credit.getExpectedDurationDays());
        assertNotNull(credit.getRiskLevel());
        assertNotNull(credit.getSeasonPeriod());
    }
}
