package com.optimize.elykia.core.service.report.monthly;

import com.itextpdf.html2pdf.HtmlConverter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.OutputStream;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyReportPdfServiceTest {

    @Mock
    private TemplateEngine templateEngine;

    @Test
    void generateGeneralPdf_composesGeneralTemplateWithSnapshotAndCompanyContext() {
        // Given
        MonthlyReportPdfService service = new MonthlyReportPdfService(templateEngine);
        Map<String, Object> snapshot = Map.of("month", 8, "year", 2026, "total", 42_000.0);
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("monthly-report-general"), contextCaptor.capture())).thenReturn("<html>general</html>");

        try (MockedStatic<HtmlConverter> converter = mockStatic(HtmlConverter.class)) {
            // When
            byte[] pdf = service.generateGeneralPdf(snapshot);

            // Then
            assertArrayEquals(new byte[0], pdf);
            Context context = contextCaptor.getValue();
            assertEquals(snapshot, context.getVariable("snapshot"));
            assertEquals("AMENOUVEVE - YAVEH", context.getVariable("companyName"));
            assertTrue(context.getVariable("generationDate").toString().matches("\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}"));
            converter.verify(() -> HtmlConverter.convertToPdf(eq("<html>general</html>"), any(OutputStream.class)));
        }
    }

    @Test
    void generateCommercialPdf_composesCommercialTemplateWithSnapshotAndTimeline() {
        // Given
        MonthlyReportPdfService service = new MonthlyReportPdfService(templateEngine);
        Map<String, Object> snapshot = Map.of("collector", "commercial.a", "year", 2026);
        List<Map<String, Object>> timeline = List.of(
                Map.of("date", "2026-08-01", "amount", 12_000.0),
                Map.of("date", "2026-08-02", "amount", 8_000.0));
        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        when(templateEngine.process(eq("monthly-report-commercial"), contextCaptor.capture())).thenReturn("<html>commercial</html>");

        try (MockedStatic<HtmlConverter> converter = mockStatic(HtmlConverter.class)) {
            // When
            byte[] pdf = service.generateCommercialPdf(snapshot, timeline);

            // Then
            assertArrayEquals(new byte[0], pdf);
            Context context = contextCaptor.getValue();
            assertEquals(snapshot, context.getVariable("snapshot"));
            assertEquals(timeline, context.getVariable("timeline"));
            assertEquals("AMENOUVEVE - YAVEH", context.getVariable("companyName"));
            converter.verify(() -> HtmlConverter.convertToPdf(eq("<html>commercial</html>"), any(OutputStream.class)));
        }
    }
}
