package com.optimize.elykia.core.service.report;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.optimize.elykia.core.dto.sale.RmDailyJournalPdfDto;
import com.optimize.elykia.core.dto.sale.RmDailyJournalPdfRequest;
import org.junit.jupiter.api.Test;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RmDailyJournalPdfServiceTest {

    private final RmDailyJournalPdfService service = new RmDailyJournalPdfService(realEngine(), new PdfHtmlRenderer());

    @Test
    void generatePdfPrintsTheDayOperationsAndPageStamp() throws Exception {
        RmDailyJournalPdfRequest request = new RmDailyJournalPdfRequest();
        request.setJournalDate("27/10/2026");
        List<RmDailyJournalPdfRequest.Operation> operations = new ArrayList<>();
        operations.add(operation("Contrôle crédit", "Ama Koffi", "09:15", "Échec", "ECART — Réseau indisponible"));
        operations.add(operation("Clôture", "Jean Mensah", "11:00", "Synchronisé", "Partiel · 2 500 FCFA"));
        operations.add(operation("Contact", "Ama Koffi", "14:05", "Local", "90112233"));
        for (int i = 4; i <= 48; i++) {
            operations.add(operation("Contrôle tontine", "Dossier " + i, "15:" + String.format("%02d", i % 60), "Local", "CONFORME"));
        }
        request.setOperations(operations);

        RmDailyJournalPdfDto dto = service.buildDto(request, "Kodjo Agbeko (RM01)");
        assertThat(dto.getFailedCount()).isEqualTo(1);
        assertThat(dto.getSyncedCount()).isEqualTo(1);
        assertThat(dto.getLocalCount()).isEqualTo(46);
        assertThat(dto.getOperatorLabel()).isEqualTo("Kodjo Agbeko (RM01)");

        byte[] pdfBytes = service.generate(request, "Kodjo Agbeko (RM01)");
        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertThat(pdf.getNumberOfPages()).isGreaterThan(1);
            String page1 = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            int last = pdf.getNumberOfPages();
            String pageN = PdfTextExtractor.getTextFromPage(pdf.getPage(last));
            assertThat(page1).contains("Rapport journalier");
            assertThat(page1).contains("AMENOUVEVE-YAVEH");
            assertThat(page1).contains("Ama Koffi");
            assertThat(page1).contains("Échec");
            assertThat(page1).contains("1/" + last);
            assertThat(pageN).contains(last + "/" + last);
        }
    }

    @Test
    void emptyDayStillRendersTheDocument() throws Exception {
        RmDailyJournalPdfRequest request = new RmDailyJournalPdfRequest();
        request.setJournalDate("27/10/2026");
        request.setOperations(null);

        byte[] pdfBytes = service.generate(request, " ");
        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            String page1 = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            assertThat(page1).contains("Aucune opération enregistrée pour cette journée.");
            assertThat(page1).contains("Chef de recouvrement");
            assertThat(page1).contains("1/1");
        }
    }

    private static RmDailyJournalPdfRequest.Operation operation(
            String type, String dossier, String time, String status, String detail) {
        RmDailyJournalPdfRequest.Operation operation = new RmDailyJournalPdfRequest.Operation();
        operation.setOperationType(type);
        operation.setDossier(dossier);
        operation.setTime(time);
        operation.setStatus(status);
        operation.setDetail(detail);
        return operation;
    }

    private static SpringTemplateEngine realEngine() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(false);
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }
}
