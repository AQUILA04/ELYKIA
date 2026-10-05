package com.optimize.elykia.core.service.ocr;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfProofTextServiceTest {

    private final PdfProofTextService service = new PdfProofTextService();

    @Test
    void extract_returnsDigitalTextWithoutRenderingWhenRichEnough() throws Exception {
        byte[] pdf = textPdf("Référence TXN-20260617-ABCD — transfert Mixx confirmé avec montant 35000 FCFA.");

        PdfProofTextService.PdfTextResult result = service.extract(pdf);

        assertThat(result.digitalText()).contains("TXN-20260617-ABCD");
        assertThat(result.pageImagePng()).isNull();
    }

    @Test
    void extract_rendersPageImageWhenDigitalTextTooShort() throws Exception {
        byte[] pdf = textPdf("ok");

        PdfProofTextService.PdfTextResult result = service.extract(pdf);

        assertThat(result.digitalText()).isEqualTo("ok");
        assertThat(result.pageImagePng()).isNotNull();
        assertThat(result.pageImagePng().length).isGreaterThan(100);
    }

    @Test
    void extract_rejectsCorruptBytes() {
        assertThatThrownBy(() -> service.extract(new byte[]{1, 2, 3, 4}))
                .isInstanceOf(IOException.class);
    }

    private static byte[] textPdf(String text) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(50, 700);
                content.showText(text);
                content.endText();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }
}
