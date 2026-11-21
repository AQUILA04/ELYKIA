package com.optimize.elykia.reporting.application;


import com.optimize.elykia.sale.application.RemainingAtClientsPdfService;
import com.optimize.elykia.sale.application.RemainingAtClientsService;
import com.optimize.elykia.finance.application.DailyOperationService;
import com.optimize.elykia.finance.application.DailyReportPdfServiceTest;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import com.optimize.elykia.sale.web.dto.RemainingAtClientsCreditDto;
import com.optimize.elykia.finance.domain.DailyOperationLog;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.finance.infrastructure.persistence.DailyOperationLogRepository;
import com.optimize.common.securities.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/** Rendu réel des PDF Journal et Reste chez les clients (design system documents). */
@ExtendWith(MockitoExtension.class)
class ReportPdfDesignRenderingTest {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 20);

    @Mock private DailyOperationLogRepository operationRepository;
    @Mock private RemainingAtClientsService remainingAtClientsService;
    @Mock private UserRepository userRepository;

    @Test
    void journalPdf_showsTotalsByTypeWithFrenchLabelsAndAllOperations() throws IOException {
        DailyOperationService service = new DailyOperationService(
                operationRepository, DailyReportPdfServiceTest.realTemplateEngine(), new PdfHtmlRenderer());
        when(operationRepository.findByDateBetween(DAY, DAY)).thenReturn(List.of(
                op(OperationType.CASH_DEPOSIT, 30_000.0, "Versement 412", 17),
                op(OperationType.CREDIT_COLLECTION, 1_500.0, "CR-001", 9),
                op(OperationType.CASH_DEPOSIT_CANCEL, -1_000.0, "Annulation 3", 18)));

        byte[] pdf = service.generatePdfExport(DAY, DAY, null);
        DailyReportPdfServiceTest.keep("journal-operations.pdf", pdf);
        String text = DailyReportPdfServiceTest.text(pdf);

        assertTrue(text.contains("Journal des opérations"), text);
        assertTrue(text.contains("TOTAUX PAR TYPE"));
        assertTrue(text.contains("Versement"));
        assertTrue(text.contains("Recouvrement"));
        assertTrue(text.contains("Versement annulé"));
        assertTrue(text.contains("Toute l'équipe"));
        assertTrue(text.contains("30 500"), "total");
        assertTrue(text.contains("Page 1/1"));
    }

    @Test
    void remainingAtClientsPdf_showsTheAmountStillOwedFirst() throws IOException {
        RemainingAtClientsPdfService service = new RemainingAtClientsPdfService(
                remainingAtClientsService, userRepository, DailyReportPdfServiceTest.realTemplateEngine(),
                new PdfHtmlRenderer());
        when(remainingAtClientsService.findAll("COM012", 2026)).thenReturn(List.of(
                new RemainingAtClientsCreditDto(1L, "DIST-012-4C4B0A", "AYIVI", "EGBETO",
                        LocalDate.of(2026, 11, 6), 8_500.0, 6_000.0)));
        when(remainingAtClientsService.loadAggregate("COM012", 2026))
                .thenReturn(new RemainingAtClientsService.Aggregate(1L, 6_000.0));
        lenient().when(userRepository.findByUserAccount_usernameIgnoreCase(anyString())).thenReturn(Optional.empty());

        byte[] pdf = service.generatePdf("COM012", 2026);
        DailyReportPdfServiceTest.keep("reste-chez-les-clients.pdf", pdf);
        String text = DailyReportPdfServiceTest.text(pdf);

        assertTrue(text.contains("Reste chez les clients"), text);
        assertTrue(text.contains("6 000 FCFA"));
        assertTrue(text.contains("AYIVI EGBETO"));
        assertTrue(text.contains("Page 1/1"));
    }

    private static DailyOperationLog op(OperationType type, double amount, String reference, int hour) {
        DailyOperationLog op = new DailyOperationLog();
        op.setType(type);
        op.setAmount(amount);
        op.setReference(reference);
        op.setDescription("Détail " + reference);
        op.setCommercialUsername("COM006");
        op.setDate(DAY);
        op.setTimestamp(LocalDateTime.of(2026, 11, 20, hour, 0));
        return op;
    }
}
