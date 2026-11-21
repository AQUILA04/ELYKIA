package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.repository.StockTontineRequestRepository;
import com.optimize.elykia.core.repository.StockTontineReturnRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import com.optimize.elykia.core.service.report.UnitPriceVisibility;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockExportServiceTest {

    @Mock
    private StockRequestRepository stockRequestRepository;
    @Mock
    private StockReturnRepository stockReturnRepository;
    @Mock
    private StockTontineRequestRepository stockTontineRequestRepository;
    @Mock
    private StockTontineReturnRepository stockTontineReturnRepository;
    @Mock
    private TontineStockRepository tontineStockRepository;
    @Mock
    private CommercialMonthlyStockService commercialMonthlyStockService;
    @Mock
    private UserService userService;
    @Mock
    private TemplateEngine templateEngine;
    @Mock
    private PdfHtmlRenderer pdfHtmlRenderer;
    @Mock
    private User currentUser;
    @Mock
    private ParameterService parameterService;
    @InjectMocks
    private StockExportService service;

    @Test
    void generateDashboardPdfExport_rejectsMissingYearOrMonthBeforeResolvingUser() {
        // Given

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.generateDashboardPdfExport("collector.a", null, 8));
        assertEquals("L'année et le mois sont obligatoires pour exporter le rapport de stock.", exception.getMessage());
        verify(userService, never()).getCurrentUser();
    }

    @Test
    void generateDashboardPdfExport_rejectsBlankCollectorForNonPromoterBeforeStockLookup() {
        // Given
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.PROMOTER)).thenReturn(false);

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.generateDashboardPdfExport("  ", 2026, 8));
        assertEquals("Un commercial doit être sélectionné pour exporter le rapport de stock.", exception.getMessage());
        verify(commercialMonthlyStockService, never()).findEnrichedByCollectorAndMonthAndYear(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void generateDashboardPdfExport_confinesPromoterToOwnUsernameBeforeStockLookup() {
        // Given
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(currentUser.getUsername()).thenReturn("promoter.a");
        when(commercialMonthlyStockService.findEnrichedByCollectorAndMonthAndYear("promoter.a", 8, 2026))
                .thenReturn(Optional.empty());

        // When / Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> service.generateDashboardPdfExport("collector.other", 2026, 8));
        assertEquals("Stock mensuel introuvable pour promoter.a — 8/2026", exception.getMessage());
        verify(commercialMonthlyStockService).findEnrichedByCollectorAndMonthAndYear("promoter.a", 8, 2026);
    }

    @Test
    void tontineStockRequestAndReturnPdfsFollowTheCashSaleParameter() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(parameterService.isEnabled(UnitPriceVisibility.CASH_SALE_PARAMETER_KEY)).thenReturn(true);
        registerUnitPriceVisibility();
        when(stockTontineRequestRepository.findAggregatedStockRequests(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());
        when(stockTontineReturnRepository.findAggregatedStockReturns(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());

        service.generateStockTontineRequestSortiePdfExport(null, null, "COM005", null);
        service.generateStockTontineReturnPdfExport(null, null, "COM005", null);

        ArgumentCaptor<Context> request = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("stock-request-sortie-export"), request.capture());
        assertEquals(Boolean.FALSE, request.getValue().getVariable(UnitPriceVisibility.CONTEXT_VARIABLE));
        ArgumentCaptor<Context> returned = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("stock-return-export"), returned.capture());
        assertEquals(Boolean.FALSE, returned.getValue().getVariable(UnitPriceVisibility.CONTEXT_VARIABLE));
        verify(parameterService, never()).isEnabled(UnitPriceVisibility.PARAMETER_KEY);
    }

    @Test
    void standardStockRequestPdfKeepsTheGeneralParameter() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(parameterService.isEnabled(UnitPriceVisibility.PARAMETER_KEY)).thenReturn(false);
        registerUnitPriceVisibility();
        when(stockRequestRepository.findAggregatedStockRequests(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());

        service.generateStockRequestSortiePdfExport(null, null, "COM005", null);

        ArgumentCaptor<Context> context = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("stock-request-sortie-export"), context.capture());
        assertEquals(Boolean.TRUE, context.getValue().getVariable(UnitPriceVisibility.CONTEXT_VARIABLE));
        verify(parameterService, never()).isEnabled(UnitPriceVisibility.CASH_SALE_PARAMETER_KEY);
    }

    @AfterEach
    void resetUnitPriceVisibility() {
        ReflectionTestUtils.setField(UnitPriceVisibility.class, "instance", null);
    }

    private void registerUnitPriceVisibility() {
        ReflectionTestUtils.setField(UnitPriceVisibility.class, "instance",
                new UnitPriceVisibility(parameterService, userService));
    }
}
