package com.optimize.elykia.shared.pdf;

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
 * Convertit du HTML Thymeleaf en PDF et tamponne le pied de page (libellé + n/N).
 */
@Component
public class PdfHtmlRenderer {

    static final DeviceRgb NAVY = new DeviceRgb(0, 51, 102);
    static final DeviceRgb WHITE = new DeviceRgb(255, 255, 255);
    /** Design system documents : navy #0a2472 sur fond pâle #f2f5fc, filet #e2e8f0. */
    static final DeviceRgb DS_NAVY = new DeviceRgb(0x0a, 0x24, 0x72);
    static final DeviceRgb DS_PALE = new DeviceRgb(0xf2, 0xf5, 0xfc);
    static final DeviceRgb DS_BORDER = new DeviceRgb(0xe2, 0xe8, 0xf0);
    static final DeviceRgb DS_MUTED = new DeviceRgb(0x64, 0x74, 0x8b);
    static final float FOOTER_HEIGHT = 28f;

    /** CLASSIC : bande navy pleine (documents historiques). MODERN : bande pâle, texte navy. */
    public enum FooterStyle { CLASSIC, MODERN }

    public byte[] htmlToPdf(String html, String footerLabel) {
        return htmlToPdf(html, footerLabel, FooterStyle.CLASSIC);
    }

    public byte[] htmlToPdf(String html, String footerLabel, FooterStyle style) {
        byte[] rawPdf = convertHtml(html);
        try {
            return stampFooter(rawPdf, footerLabel, style);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible d'ajouter le pied de page PDF", e);
        }
    }

    private byte[] convertHtml(String html) {
        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }

    private byte[] stampFooter(byte[] rawPdf, String footerLabel, FooterStyle style) throws IOException {
        ByteArrayOutputStream stamped = new ByteArrayOutputStream();
        try (PdfDocument pdf = new PdfDocument(
                new PdfReader(new ByteArrayInputStream(rawPdf)),
                new PdfWriter(stamped))) {
            PdfFont font = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont fontBold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            int total = pdf.getNumberOfPages();
            for (int i = 1; i <= total; i++) {
                drawFooter(pdf.getPage(i), font, fontBold, footerLabel, i, total, style);
            }
        }
        return stamped.toByteArray();
    }

    private void drawFooter(PdfPage page, PdfFont font, PdfFont fontBold,
                            String footerLabel, int pageNumber, int totalPages, FooterStyle style) {
        boolean modern = style == FooterStyle.MODERN;
        Rectangle box = page.getPageSize();
        PdfCanvas pdfCanvas = new PdfCanvas(page.newContentStreamAfter(), page.getResources(), page.getDocument());
        pdfCanvas.saveState();
        pdfCanvas.setFillColor(modern ? DS_PALE : NAVY);
        pdfCanvas.rectangle(box.getLeft(), box.getBottom(), box.getWidth(), FOOTER_HEIGHT);
        pdfCanvas.fill();
        if (modern) {
            pdfCanvas.setFillColor(DS_BORDER);
            pdfCanvas.rectangle(box.getLeft(), box.getBottom() + FOOTER_HEIGHT, box.getWidth(), 0.75f);
            pdfCanvas.fill();
        }
        pdfCanvas.restoreState();

        float y = box.getBottom() + 10f;
        float left = box.getLeft() + 40f;
        float right = box.getRight() - 40f;

        try (Canvas layout = new Canvas(pdfCanvas, box)) {
            layout.showTextAligned(
                    new Paragraph(footerLabel)
                            .setFont(font)
                            .setFontSize(8)
                            .setFontColor(modern ? DS_MUTED : WHITE)
                            .setMargin(0),
                    left, y, TextAlignment.LEFT);
            layout.showTextAligned(
                    new Paragraph((modern ? "Page " : "") + pageNumber + "/" + totalPages)
                            .setFont(fontBold)
                            .setFontSize(9)
                            .setFontColor(modern ? DS_NAVY : WHITE)
                            .setMargin(0),
                    right, y, TextAlignment.RIGHT);
        }
    }
}
