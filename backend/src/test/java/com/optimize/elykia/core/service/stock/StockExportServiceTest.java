package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.repository.StockRequestRepository;
import com.optimize.elykia.core.repository.StockReturnRepository;
import com.optimize.elykia.core.repository.StockTontineRequestRepository;
import com.optimize.elykia.core.repository.StockTontineReturnRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.commercial.CommercialMonthlyStockService;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
}
