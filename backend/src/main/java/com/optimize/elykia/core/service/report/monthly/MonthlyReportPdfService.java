package com.optimize.elykia.core.service.report.monthly;

import com.itextpdf.html2pdf.HtmlConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MonthlyReportPdfService {

    private final TemplateEngine templateEngine;

    public byte[] generateGeneralPdf(Map<String, Object> snapshot) {
        Context context = new Context();
        context.setVariable("snapshot", snapshot);
        String html = templateEngine.process("monthly-report-general", context);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, output);
        return output.toByteArray();
    }

    public byte[] generateCommercialPdf(Map<String, Object> snapshot, List<Map<String, Object>> timeline) {
        Context context = new Context();
        context.setVariable("snapshot", snapshot);
        context.setVariable("timeline", timeline);
        String html = templateEngine.process("monthly-report-commercial", context);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, output);
        return output.toByteArray();
    }
}
