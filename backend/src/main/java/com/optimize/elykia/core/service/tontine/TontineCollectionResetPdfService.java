package com.optimize.elykia.core.service.tontine;

import com.itextpdf.html2pdf.HtmlConverter;
import com.optimize.elykia.core.dto.TontineCollectionArchiveRowDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TontineCollectionResetPdfService {

    private static final String COMPANY_NAME = "AMENOUVEVE - YAVEH";
    private static final DateTimeFormatter GENERATION_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final TemplateEngine templateEngine;

    public byte[] generateArchivePdf(
            int sessionYear,
            String commercial,
            String quarter,
            List<TontineCollectionArchiveRowDto> rows) {
        double totalAmount = rows.stream().mapToDouble(r -> r.amount() != null ? r.amount() : 0.0).sum();

        Context context = new Context();
        context.setVariable("companyName", COMPANY_NAME);
        context.setVariable("generationDate", LocalDateTime.now().format(GENERATION_FORMAT));
        context.setVariable("sessionYear", sessionYear);
        context.setVariable("commercial", commercial);
        context.setVariable("quarter", quarter);
        context.setVariable("rows", rows);
        context.setVariable("totalAmount", totalAmount);
        context.setVariable("collectionCount", rows.size());

        String html = templateEngine.process("tontine-collection-archive-report", context);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, output);
        return output.toByteArray();
    }

    public String buildFileName(int sessionYear, String commercial, String quarter) {
        String safeCommercial = sanitize(commercial);
        String safeQuarter = sanitize(quarter);
        return String.format("collectes-tontine-%s-%s-%d.pdf", safeCommercial, safeQuarter, sessionYear);
    }

    public String buildStorageKey(int sessionYear, Long runId, String commercial, String quarter) {
        String safeCommercial = sanitize(commercial);
        String safeQuarter = sanitize(quarter);
        return String.format("tontine-collection-reset/%d/run-%d/%s/%s.pdf", sessionYear, runId, safeCommercial, safeQuarter);
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) {
            return "NA";
        }
        return value.replaceAll("[^a-zA-Z0-9_-]", "_");
    }
}
