package com.optimize.elykia.core.service.report;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class PdfHtmlRendererTest {

    private final PdfHtmlRenderer renderer = new PdfHtmlRenderer();

    @Test
    void stampsPageNumbersAsCurrentOverTotal() throws IOException {
        String html = """
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    @page { size: A4; margin: 14mm 14mm 24mm 14mm; }
                    .break { page-break-after: always; }
                  </style>
                </head>
                <body>
                  <div class="break">Page A</div>
                  <div>Page B</div>
                </body>
                </html>
                """;

        byte[] pdfBytes = renderer.htmlToPdf(html, "AMENOUVEVE-YAVEH  |  Fiche Client");

        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(2);
            String page1 = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            String page2 = PdfTextExtractor.getTextFromPage(pdf.getPage(2));
            assertThat(page1).contains("1/2");
            assertThat(page1).contains("AMENOUVEVE-YAVEH");
            assertThat(page1).contains("Fiche Client");
            assertThat(page2).contains("2/2");
            assertThat(page2).contains("AMENOUVEVE-YAVEH");
        }
    }
}
