package com.optimize.elykia.core.service.report;


import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.optimize.elykia.core.dto.DailyReportExportPdfDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReconciliationLineDto.ReconciliationStatus;
import com.optimize.elykia.core.dto.report.cockpit.CommercialReportSummaryDto;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.report.DailyOperationLog;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.core.repository.DailyOperationLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/** Rendu réel : templates Thymeleaf + iText, texte extrait du PDF produit. */
@ExtendWith(MockitoExtension.class)
class DailyReportPdfServiceTest {

    private static final LocalDate START = LocalDate.of(2026, 11, 16);
    private static final LocalDate END = LocalDate.of(2026, 11, 20);

    @Mock private DailyOperationLogRepository operationLogRepository;
    @Mock private CommercialCockpitService cockpitService;

    static TemplateEngine realTemplateEngine() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        // Même moteur que l'application (SpEL), pas le moteur Thymeleaf brut (OGNL).
        TemplateEngine engine = new org.thymeleaf.spring6.SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }

    static String text(byte[] pdfBytes) throws IOException {
        StringBuilder text = new StringBuilder();
        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            for (int i = 1; i <= pdf.getNumberOfPages(); i++) {
                text.append(PdfTextExtractor.getTextFromPage(pdf.getPage(i))).append('\n');
            }
        }
        return text.toString();
    }

    /** Garde le PDF dans target/ pour une relecture visuelle. */
    static void keep(String name, byte[] pdf) throws IOException {
        Path dir = Path.of("target", "pdf-preview");
        Files.createDirectories(dir);
        Files.write(dir.resolve(name), pdf);
    }

    @Test
    void generatePdfExport_rendersTheReconciliationActivityAndOperationsInTheNewDesign() throws IOException {
        DailyReportPdfService service = new DailyReportPdfService(
                operationLogRepository, cockpitService, realTemplateEngine(), new PdfHtmlRenderer());
        DailyCommercialReport activity = new DailyCommercialReport();
        activity.setCreditSalesCount(1);
        activity.setCreditSalesAmount(17_200.0);
        activity.setCollectionsCount(11);
        activity.setCollectionsAmount(26_950.0);
        activity.setTontineCollectionsCount(128);
        activity.setTontineCollectionsAmount(317_742.0);
        when(cockpitService.summary("COM015", START, END)).thenReturn(new CommercialReportSummaryDto(
                START, END, line(ReconciliationStatus.LATE, 1_302_550.0), activity, List.of()));
        List<DailyOperationLog> operations = new ArrayList<>();
        operations.add(operation(OperationType.CREDIT_SALES, 17_200.0, "DIST-015-AB12", "Client: Alice, Avance: 2 000"));
        for (int i = 0; i < 40; i++) {
            operations.add(operation(OperationType.TONTINE_COLLECTION, 2_500.0, "COL-" + i, "client Bob, collecte"));
        }
        when(operationLogRepository.findByDateBetweenAndCommercialUsername(START, END, "COM015")).thenReturn(operations);

        byte[] pdf = service.generatePdfExport(START, END, "COM015");
        keep("rapport-commercial.pdf", pdf);
        String text = text(pdf);

        assertTrue(text.contains("Rapport commercial"), text);
        assertTrue(text.contains("RAPPROCHEMENT DE LA PÉRIODE"));
        assertTrue(text.contains("1 420 675"), "dû à la caisse");
        assertTrue(text.contains("1 302 550 FCFA"), "reste à verser");
        assertTrue(text.contains("Reste à verser"));
        assertTrue(text.contains("VENTES À CRÉDIT"));
        assertTrue(text.contains("COLLECTES TONTINE"));
        assertTrue(text.contains("Alice"));
        assertTrue(text.contains("SIGNATURE DU GESTIONNAIRE"));
        assertTrue(text.contains("Page 1/"), "pagination n/N");
    }

    @Test
    void buildDto_keepsOnlyNonEmptySectionsAndLabelsThePeriod() {
        DailyReportPdfService service = new DailyReportPdfService(operationLogRepository, cockpitService, null, null);
        DailyReportExportPdfDto dto = service.buildDto(END, END, "COM015", new DailyCommercialReport(),
                line(ReconciliationStatus.UP_TO_DATE, 0.0),
                java.util.Map.of(OperationType.CREDIT_COLLECTION,
                        List.of(operation(OperationType.CREDIT_COLLECTION, 1_500.0, "REC-1", "client Bob, mise"))));

        assertEquals("Journée du 20/11/2026", dto.getPeriodLabel());
        assertEquals("À jour", dto.getStatusLabel());
        assertEquals("pill-green", dto.getStatusClass());
        assertEquals(1, dto.getSections().size());
        assertEquals("Recouvrements", dto.getSections().get(0).getTitle());
        assertEquals("Bob", dto.getSections().get(0).getRows().get(0).getClientName());
    }

    private static CommercialReconciliationLineDto line(ReconciliationStatus status, double remaining) {
        return new CommercialReconciliationLineDto("COM015", status, 27_725.0, 317_742.0, 0.0, 345_467.0,
                1_075_208.0, 1_420_675.0, 118_500.0, 0.0, 0.0, 118_500.0, 0.0,
                0.0, 0.0, 0.0, remaining, remaining, 1_761_333.0, 140L);
    }

    private static DailyOperationLog operation(OperationType type, double amount, String reference, String description) {
        DailyOperationLog op = new DailyOperationLog();
        op.setType(type);
        op.setAmount(amount);
        op.setReference(reference);
        op.setDescription(description);
        op.setCommercialUsername("COM015");
        op.setDate(END);
        op.setTimestamp(LocalDateTime.of(2026, 11, 20, 9, 30));
        return op;
    }
}
