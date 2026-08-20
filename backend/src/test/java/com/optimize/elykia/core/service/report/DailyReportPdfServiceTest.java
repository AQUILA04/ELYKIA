package com.optimize.elykia.core.service.report;

import com.itextpdf.html2pdf.HtmlConverter;
import com.optimize.elykia.core.dto.DailyReportExportPdfDto;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.report.DailyOperationLog;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.repository.DailyOperationLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DailyReportPdfServiceTest {

    @Mock
    private DailyOperationLogRepository operationLogRepository;
    @Mock
    private DailyCommercialReportRepository reportRepository;
    @Mock
    private TemplateEngine templateEngine;
    @Mock
    private DailyCommercialReport kpi;

    @Test
    void generatePdfExport_aggregatesKpisAndOperationRowsIntoTheDailyReportTemplate() {
        // Given
        DailyReportPdfService service = new DailyReportPdfService(operationLogRepository, reportRepository, templateEngine);
        LocalDate startDate = LocalDate.of(2026, 8, 1);
        LocalDate endDate = LocalDate.of(2026, 8, 2);
        when(kpi.getCreditSalesCount()).thenReturn(2);
        when(kpi.getCreditSalesAmount()).thenReturn(12_000.0);
        when(kpi.getCollectionsCount()).thenReturn(1);
        when(kpi.getCollectionsAmount()).thenReturn(5_500.0);
        when(kpi.getNewClientsCount()).thenReturn(1);
        when(kpi.getNewAccountsBalance()).thenReturn(2_000.0);
        when(kpi.getTotalAmountToDeposit()).thenReturn(15_500.0);
        when(reportRepository.findAggregatedByDateBetweenAndCommercialUsername("commercial.a", startDate, endDate))
                .thenReturn(List.of(kpi));
        when(operationLogRepository.findByDateBetweenAndCommercialUsername(startDate, endDate, "commercial.a"))
                .thenReturn(List.of(
                        operation(startDate, 9, 30, OperationType.CREDIT_SALES, 12_000.0,
                                "CR-001", "Client: Alice, Avance: 1 000"),
                        operation(endDate, 11, 5, OperationType.CREDIT_COLLECTION, 5_500.0,
                                "REC-001", "client Bob, recouvrement"),
                        operation(endDate, 12, 0, OperationType.NEW_CLIENT, 0.0,
                                "CLI-001", "Client: Chloé, inscription")));
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("daily-report-export"), contextCaptor.capture())).thenReturn("<html>daily</html>");

        try (MockedStatic<HtmlConverter> converter = mockStatic(HtmlConverter.class)) {
            // When
            byte[] pdf = service.generatePdfExport(startDate, endDate, "commercial.a");

            // Then
            assertArrayEquals(new byte[0], pdf);
            DailyReportExportPdfDto report = (DailyReportExportPdfDto) contextCaptor.getValue().getVariable("report");
            assertEquals("Rapport Journalier", report.getTitle());
            assertEquals("AMENOUVEVE - YAVEH", report.getCompanyName());
            assertEquals("01/08/2026", report.getStartDate());
            assertEquals("02/08/2026", report.getEndDate());
            assertEquals("commercial.a", report.getCommercialUsername());
            assertEquals(2, report.getDistributionCount());
            assertEquals(12_000.0, report.getDistributionAmount());
            assertEquals(1, report.getRecoveryCount());
            assertEquals(5_500.0, report.getRecoveryAmount());
            assertEquals(1, report.getNewClientCount());
            assertEquals(2_000.0, report.getNewClientBalance());
            assertEquals(15_500.0, report.getTotalToPay());
            assertEquals(1, report.getDistributions().size());
            assertEquals("09:30", report.getDistributions().get(0).getTime());
            assertEquals("Alice", report.getDistributions().get(0).getClientName());
            assertEquals("CR-001", report.getDistributions().get(0).getDetails());
            assertEquals("Avance: 1 000", report.getDistributions().get(0).getExtra());
            assertTrue(report.getDistributions().get(0).getAmount().endsWith("FCFA"));
            assertEquals(1, report.getRecoveries().size());
            assertEquals("Bob", report.getRecoveries().get(0).getClientName());
            assertEquals("REC-001", report.getRecoveries().get(0).getDetails());
            assertEquals(1, report.getNewClients().size());
            assertEquals("0 FCFA", report.getNewClients().get(0).getAmount());
            converter.verify(() -> HtmlConverter.convertToPdf(eq("<html>daily</html>"), any(OutputStream.class)));
        }
    }

    @Test
    void generatePdfExport_withoutKpiOrOperationsProducesZeroedReportContract() {
        // Given
        DailyReportPdfService service = new DailyReportPdfService(operationLogRepository, reportRepository, templateEngine);
        LocalDate date = LocalDate.of(2026, 8, 3);
        when(reportRepository.findAggregatedByDateBetweenAndCommercialUsername("commercial.empty", date, date))
                .thenReturn(List.of());
        when(operationLogRepository.findByDateBetweenAndCommercialUsername(date, date, "commercial.empty"))
                .thenReturn(List.of());
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("daily-report-export"), contextCaptor.capture())).thenReturn("<html>empty</html>");

        try (MockedStatic<HtmlConverter> converter = mockStatic(HtmlConverter.class)) {
            // When
            service.generatePdfExport(date, date, "commercial.empty");

            // Then
            DailyReportExportPdfDto report = (DailyReportExportPdfDto) contextCaptor.getValue().getVariable("report");
            assertEquals(0, report.getDistributionCount());
            assertEquals(0.0, report.getDistributionAmount());
            assertEquals(0, report.getRecoveryCount());
            assertEquals(0.0, report.getRecoveryAmount());
            assertEquals(0, report.getTontineCollectionCount());
            assertEquals(0.0, report.getTotalToPay());
            assertTrue(report.getDistributions().isEmpty());
            assertTrue(report.getRecoveries().isEmpty());
            assertTrue(report.getTontineDeliveries().isEmpty());
            converter.verify(() -> HtmlConverter.convertToPdf(eq("<html>empty</html>"), any(OutputStream.class)));
        }
    }

    private DailyOperationLog operation(LocalDate date, int hour, int minute, OperationType type,
            double amount, String reference, String description) {
        return new DailyOperationLog(
                date,
                "commercial.a",
                LocalDateTime.of(date.getYear(), date.getMonth(), date.getDayOfMonth(), hour, minute),
                type,
                amount,
                reference,
                description);
    }
}
