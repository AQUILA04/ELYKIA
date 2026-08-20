package com.optimize.elykia.core.service.report;

import com.itextpdf.html2pdf.HtmlConverter;
import com.optimize.elykia.core.dto.sale.RecoveryManagerReportSummaryDto;
import com.optimize.elykia.core.entity.sale.RecoveryManagerOperation;
import com.optimize.elykia.core.repository.RecoveryManagerOperationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.OutputStream;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecoveryManagerReportPdfServiceTest {

    @Mock
    private RecoveryManagerOperationRepository operationRepository;
    @Mock
    private TemplateEngine templateEngine;
    @Mock
    private Page<RecoveryManagerOperation> operationsPage;
    @Mock
    private RecoveryManagerOperation operation;

    @Test
    void generatePdf_composesRecoverySummaryRemittancesAndOperationRows() {
        // Given
        RecoveryManagerReportPdfService service = new RecoveryManagerReportPdfService(operationRepository, templateEngine);
        LocalDate startDate = LocalDate.of(2026, 8, 1);
        LocalDate endDate = LocalDate.of(2026, 8, 31);
        when(operationRepository.sumAmountCollected(startDate, endDate, "manager.a", "commercial.a")).thenReturn(18_500.0);
        when(operationRepository.countOperations(startDate, endDate, "manager.a", "commercial.a")).thenReturn(4);
        when(operationRepository.countDistinctCommercials(startDate, endDate, "manager.a", "commercial.a")).thenReturn(1);
        when(operationRepository.findRemittanceByCommercial(startDate, endDate, "manager.a", "commercial.a"))
                .thenReturn(List.<Object[]>of(new Object[] {"commercial.a", 4L, 18_500.0}));
        when(operationRepository.findByFilters(eq(startDate), eq(endDate), eq("manager.a"), eq("commercial.a"), any(Pageable.class)))
                .thenReturn(operationsPage);
        when(operationsPage.getContent()).thenReturn(List.of(operation));
        when(operation.getOperationDate()).thenReturn(LocalDate.of(2026, 8, 15));
        when(operation.getCreditReference()).thenReturn("CR-001");
        when(operation.getClientName()).thenReturn("Alice Test");
        when(operation.getCommercialUsername()).thenReturn("commercial.a");
        when(operation.getAmountCollected()).thenReturn(4_500.0);
        when(operation.getIsPartial()).thenReturn(true);
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("recovery-manager-report-export"), contextCaptor.capture())).thenReturn("<html>recovery</html>");

        try (MockedStatic<HtmlConverter> converter = mockStatic(HtmlConverter.class)) {
            // When
            byte[] pdf = service.generatePdf(startDate, endDate, "manager.a", "commercial.a");

            // Then
            assertArrayEquals(new byte[0], pdf);
            Context context = contextCaptor.getValue();
            RecoveryManagerReportSummaryDto summary = (RecoveryManagerReportSummaryDto) context.getVariable("summary");
            assertEquals(18_500.0, summary.getTotalAmountCollected());
            assertEquals(4, summary.getTotalOperationsCount());
            assertEquals(1, summary.getCommercialsCount());
            assertEquals(1, summary.getRemittanceByCommercial().size());
            assertEquals("commercial.a", summary.getRemittanceByCommercial().get(0).getCommercialUsername());
            assertEquals(4, summary.getRemittanceByCommercial().get(0).getOperationsCount());
            assertEquals(18_500.0, summary.getRemittanceByCommercial().get(0).getTotalToRemit());
            assertEquals("01/08/2026", context.getVariable("startDate"));
            assertEquals("31/08/2026", context.getVariable("endDate"));
            assertEquals("manager.a", context.getVariable("recoveryManagerUsername"));
            @SuppressWarnings("unchecked")
            List<RecoveryManagerReportPdfService.OperationPdfRow> rows =
                    (List<RecoveryManagerReportPdfService.OperationPdfRow>) context.getVariable("operations");
            assertEquals(1, rows.size());
            assertEquals("15/08/2026", rows.get(0).date());
            assertEquals("CR-001", rows.get(0).creditReference());
            assertEquals("Alice Test", rows.get(0).clientName());
            assertEquals("commercial.a", rows.get(0).commercialUsername());
            assertEquals(4_500.0, rows.get(0).amount());
            assertEquals("Partiel", rows.get(0).type());
            converter.verify(() -> HtmlConverter.convertToPdf(eq("<html>recovery</html>"), any(OutputStream.class)));
        }
    }

    @Test
    void generatePdf_normalizesMissingStatisticsAndOperationFields() {
        // Given
        RecoveryManagerReportPdfService service = new RecoveryManagerReportPdfService(operationRepository, templateEngine);
        LocalDate date = LocalDate.of(2026, 8, 5);
        when(operationRepository.sumAmountCollected(date, date, null, null)).thenReturn(null);
        when(operationRepository.countOperations(date, date, null, null)).thenReturn(null);
        when(operationRepository.countDistinctCommercials(date, date, null, null)).thenReturn(null);
        when(operationRepository.findRemittanceByCommercial(date, date, null, null)).thenReturn(List.of());
        when(operationRepository.findByFilters(eq(date), eq(date), eq(null), eq(null), any(Pageable.class)))
                .thenReturn(operationsPage);
        when(operationsPage.getContent()).thenReturn(List.of(operation));
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("recovery-manager-report-export"), contextCaptor.capture())).thenReturn("<html>empty</html>");

        try (MockedStatic<HtmlConverter> converter = mockStatic(HtmlConverter.class)) {
            // When
            service.generatePdf(date, date, null, null);

            // Then
            RecoveryManagerReportSummaryDto summary =
                    (RecoveryManagerReportSummaryDto) contextCaptor.getValue().getVariable("summary");
            assertEquals(0.0, summary.getTotalAmountCollected());
            assertEquals(0, summary.getTotalOperationsCount());
            assertEquals(0, summary.getCommercialsCount());
            assertTrue(summary.getRemittanceByCommercial().isEmpty());
            assertEquals("Tous", contextCaptor.getValue().getVariable("recoveryManagerUsername"));
            @SuppressWarnings("unchecked")
            List<RecoveryManagerReportPdfService.OperationPdfRow> rows =
                    (List<RecoveryManagerReportPdfService.OperationPdfRow>) contextCaptor.getValue().getVariable("operations");
            assertEquals(1, rows.size());
            assertEquals("", rows.get(0).date());
            assertEquals("", rows.get(0).creditReference());
            assertEquals("", rows.get(0).clientName());
            assertEquals("", rows.get(0).commercialUsername());
            assertEquals(0.0, rows.get(0).amount());
            assertEquals("Total", rows.get(0).type());
            converter.verify(() -> HtmlConverter.convertToPdf(eq("<html>empty</html>"), any(OutputStream.class)));
        }
    }
}
