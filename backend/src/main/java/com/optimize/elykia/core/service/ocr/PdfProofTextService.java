package com.optimize.elykia.core.service.ocr;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Handles PDF receipts: digital text extraction first, then page-1 render for OCR.
 */
@Component
@Slf4j
public class PdfProofTextService {

    public record PdfTextResult(String digitalText, byte[] pageImagePng) {
    }

    public PdfTextResult extract(byte[] pdfBytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            String digital = "";
            if (document.getNumberOfPages() > 0) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(1);
                stripper.setEndPage(Math.min(2, document.getNumberOfPages()));
                digital = stripper.getText(document);
            }
            byte[] image = null;
            if (!StringUtils.hasText(digital) || digital.trim().length() < 20) {
                if (document.getNumberOfPages() > 0) {
                    PDFRenderer renderer = new PDFRenderer(document);
                    BufferedImage bim = renderer.renderImageWithDPI(0, 300, ImageType.RGB);
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    ImageIO.write(bim, "png", baos);
                    image = baos.toByteArray();
                }
            }
            return new PdfTextResult(digital != null ? digital.trim() : "", image);
        }
    }
}
