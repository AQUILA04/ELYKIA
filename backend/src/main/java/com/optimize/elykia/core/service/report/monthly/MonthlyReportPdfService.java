package com.optimize.elykia.core.service.report.monthly;

import com.itextpdf.html2pdf.HtmlConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MonthlyReportPdfService {

    private static final String COMPANY_NAME = "AMENOUVEVE - YAVEH";
    private static final DateTimeFormatter GENERATION_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final TemplateEngine templateEngine;

    public byte[] generateGeneralPdf(Map<String, Object> snapshot) {
        Context context = buildContext(snapshot);
        String html = templateEngine.process("monthly-report-general", context);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, output);
        return output.toByteArray();
    }

    public byte[] generateCommercialPdf(Map<String, Object> snapshot, List<Map<String, Object>> timeline) {
        Context context = buildContext(snapshot);
        context.setVariable("timeline", timeline);
        String html = templateEngine.process("monthly-report-commercial", context);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, output);
        return output.toByteArray();
    }

    private Context buildContext(Map<String, Object> snapshot) {
        Context context = new Context();
        context.setVariable("snapshot", snapshot);
        context.setVariable("companyName", COMPANY_NAME);
        context.setVariable("generationDate", LocalDateTime.now().format(GENERATION_FORMAT));
        return context;
    }
}
