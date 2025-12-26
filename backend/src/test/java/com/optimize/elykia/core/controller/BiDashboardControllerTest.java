package com.optimize.elykia.core.controller;

import com.optimize.elykia.core.dto.bi.*;
import com.optimize.elykia.core.service.BiDashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BiDashboardControllerTest {

    @Mock
    private BiDashboardService biDashboardService;

    @InjectMocks
    private BiDashboardController controller;

    private DashboardOverviewDto mockOverview;
    private SalesMetricsDto mockSalesMetrics;
    private CollectionMetricsDto mockCollectionMetrics;
    private StockMetricsDto mockStockMetrics;
    private PortfolioMetricsDto mockPortfolioMetrics;

    @BeforeEach
    void setUp() {
        mockSalesMetrics = new SalesMetricsDto(250000.0, 80000.0, 32.0, 10, 15.0, 25000.0);
        mockCollectionMetrics = new CollectionMetricsDto(125000.0, 50.0, 10.0, 8, 2);
        mockStockMetrics = new StockMetricsDto(15000000.0, 245, 32, 15, 6.8);
        mockPortfolioMetrics = new PortfolioMetricsDto(120, 8500000.0, 1250000.0, 450000.0, 850000.0, 1250000.0);
        
        mockOverview = new DashboardOverviewDto(
            mockSalesMetrics,
            mockCollectionMetrics,
            mockStockMetrics,
            mockPortfolioMetrics
        );
    }

    @Test
    void testGetOverview_WithDates() {
        // Given
        LocalDate startDate = LocalDate.of(2025, 11, 1);
        LocalDate endDate = LocalDate.of(2025, 11, 18);
        when(biDashboardService.getOverview(startDate, endDate)).thenReturn(mockOverview);

        // When
        ResponseEntity response = controller.getOverview(startDate, endDate);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(biDashboardService).getOverview(startDate, endDate);
    }

    @Test
    void testGetOverview_WithoutDates() {
        // Given
        when(biDashboardService.getOverview(any(), any())).thenReturn(mockOverview);

        // When
        ResponseEntity response = controller.getOverview(null, null);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(biDashboardService).getOverview(any(), any());
    }

    @Test
    void testGetSalesMetrics() {
        // Given
        LocalDate startDate = LocalDate.of(2025, 11, 1);
        LocalDate endDate = LocalDate.of(2025, 11, 18);
        when(biDashboardService.getSalesMetrics(startDate, endDate)).thenReturn(mockSalesMetrics);

        // When
        ResponseEntity response = controller.getSalesMetrics(startDate, endDate);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(biDashboardService).getSalesMetrics(startDate, endDate);
    }

    @Test
    void testGetCollectionMetrics() {
        // Given
        LocalDate startDate = LocalDate.of(2025, 11, 1);
        LocalDate endDate = LocalDate.of(2025, 11, 18);
        when(biDashboardService.getCollectionMetrics(startDate, endDate)).thenReturn(mockCollectionMetrics);

        // When
        ResponseEntity response = controller.getCollectionMetrics(startDate, endDate);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(biDashboardService).getCollectionMetrics(startDate, endDate);
    }

    @Test
    void testGetStockMetrics() {
        // Given
        when(biDashboardService.getStockMetrics()).thenReturn(mockStockMetrics);

        // When
        ResponseEntity response = controller.getStockMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(biDashboardService).getStockMetrics();
    }

    @Test
    void testGetPortfolioMetrics() {
        // Given
        when(biDashboardService.getPortfolioMetrics()).thenReturn(mockPortfolioMetrics);

        // When
        ResponseEntity response = controller.getPortfolioMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(biDashboardService).getPortfolioMetrics();
    }
}
