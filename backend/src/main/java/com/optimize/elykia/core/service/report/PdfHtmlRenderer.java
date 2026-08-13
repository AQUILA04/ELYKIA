package com.optimize.elykia.core.service.report;

import com.itextpdf.html2pdf.HtmlConverter;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Convertit du HTML Thymeleaf en PDF et tamponne le pied de page navy (libellé + n/N).
 */
@Component
public class PdfHtmlRenderer {

    static final DeviceRgb NAVY = new DeviceRgb(0, 51, 102);
    static final DeviceRgb WHITE = new DeviceRgb(255, 255, 255);
    static final float FOOTER_HEIGHT = 28f;

    public byte[] htmlToPdf(String html, String footerLabel) {
        byte[] rawPdf = convertHtml(html);
        try {
            return stampFooter(rawPdf, footerLabel);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible d'ajouter le pied de page PDF", e);
        }
    }

    private byte[] convertHtml(String html) {
        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }

    private byte[] stampFooter(byte[] rawPdf, String footerLabel) throws IOException {
        ByteArrayOutputStream stamped = new ByteArrayOutputStream();
        try (PdfDocument pdf = new PdfDocument(
                new PdfReader(new ByteArrayInputStream(rawPdf)),
                new PdfWriter(stamped))) {
            PdfFont font = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont fontBold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            int total = pdf.getNumberOfPages();
            for (int i = 1; i <= total; i++) {
                drawFooter(pdf.getPage(i), font, fontBold, footerLabel, i, total);
            }
        }
        return stamped.toByteArray();
    }

    private void drawFooter(PdfPage page, PdfFont font, PdfFont fontBold,
                            String footerLabel, int pageNumber, int totalPages) {
        Rectangle box = page.getPageSize();
        PdfCanvas pdfCanvas = new PdfCanvas(page.newContentStreamAfter(), page.getResources(), page.getDocument());
        pdfCanvas.saveState();
        pdfCanvas.setFillColor(NAVY);
        pdfCanvas.rectangle(box.getLeft(), box.getBottom(), box.getWidth(), FOOTER_HEIGHT);
        pdfCanvas.fill();
        pdfCanvas.restoreState();

        float y = box.getBottom() + 10f;
        float left = box.getLeft() + 36f;
        float right = box.getRight() - 36f;

        try (Canvas layout = new Canvas(pdfCanvas, box)) {
            layout.showTextAligned(
                    new Paragraph(footerLabel)
                            .setFont(font)
                            .setFontSize(8)
                            .setFontColor(WHITE)
                            .setMargin(0),
                    left, y, TextAlignment.LEFT);
            layout.showTextAligned(
                    new Paragraph(pageNumber + "/" + totalPages)
                            .setFont(fontBold)
                            .setFontSize(9)
                            .setFontColor(WHITE)
                            .setMargin(0),
                    right, y, TextAlignment.RIGHT);
        }
    }
}
