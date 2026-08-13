package com.optimize.elykia.core.service.report;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.elykia.core.dto.report.RemainingAtClientsCreditDto;
import com.optimize.elykia.core.dto.report.RemainingAtClientsExportPdfDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RemainingAtClientsPdfServiceTest {

    @Mock private RemainingAtClientsService remainingAtClientsService;
    @Mock private UserRepository userRepository;
    @Mock private TemplateEngine templateEngine;

    private RemainingAtClientsPdfService service;

    @BeforeEach
    void setUp() {
        service = new RemainingAtClientsPdfService(
                remainingAtClientsService, userRepository, templateEngine, new PdfHtmlRenderer());
    }

    @Test
    void generatePdfRejectsBlankCommercial() {
        assertThatThrownBy(() -> service.generatePdf("  ", 2026))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("commercial");
    }

    @Test
    void generatePdfRendersTitleCommercialAndPageNumbers() throws Exception {
        RemainingAtClientsCreditDto credit = new RemainingAtClientsCreditDto(
                1L, "CR-100", "Mensah", "Koffi", LocalDate.of(2026, 2, 15), 50000.0, 12000.0);

        when(remainingAtClientsService.findAll("COM004", 2026)).thenReturn(List.of(credit));
        when(remainingAtClientsService.loadAggregate("COM004", 2026))
                .thenReturn(new RemainingAtClientsService.Aggregate(1L, 12000.0));

        User user = new User();
        user.setFirstname("Kodjo");
        user.setLastname("Agbeko");
        when(userRepository.findByUserAccount_usernameIgnoreCase("COM004")).thenReturn(Optional.of(user));

        when(templateEngine.process(eq("remaining-at-clients-export"), any(Context.class))).thenAnswer(invocation -> {
            Context context = invocation.getArgument(1);
            RemainingAtClientsExportPdfDto doc = (RemainingAtClientsExportPdfDto) context.getVariable("doc");
            return """
                    <!DOCTYPE html>
                    <html>
                    <head><style>@page { size: A4; margin: 14mm 14mm 24mm 14mm; }</style></head>
                    <body>
                      <div style="page-break-after: always;">
                        <h1>%s</h1>
                        <p>%s</p>
                        <p>Année %s — %s vente(s)</p>
                      </div>
                      <div>
                        <p>Page suite — %s</p>
                      </div>
                    </body>
                    </html>
                    """.formatted(
                    context.getVariable("pdfDocumentTitle"),
                    doc.getCommercialLabel(),
                    doc.getYear(),
                    doc.getSalesCount(),
                    doc.getRows().get(0).getReference());
        });

        byte[] pdfBytes = service.generatePdf("COM004", 2026);

        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        org.mockito.Mockito.verify(templateEngine).process(eq("remaining-at-clients-export"), contextCaptor.capture());
        Context captured = contextCaptor.getValue();
        assertThat(captured.getVariable("pdfDocumentTitle")).isEqualTo("Reste chez les clients");
        assertThat(captured.getVariable("pdfCompanyName")).isEqualTo("AMENOUVEVE-YAVEH");

        RemainingAtClientsExportPdfDto dto = (RemainingAtClientsExportPdfDto) captured.getVariable("doc");
        assertThat(dto.getCommercialLabel()).isEqualTo("COM004 — Kodjo Agbeko");
        assertThat(dto.getYear()).isEqualTo(2026);
        assertThat(dto.getSalesCount()).isEqualTo(1L);
        assertThat(dto.getTotalRemainingAmount()).isEqualTo(12000.0);
        assertThat(dto.getRows()).hasSize(1);
        assertThat(dto.getRows().get(0).getReference()).isEqualTo("CR-100");

        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(2);
            String page1 = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            String page2 = PdfTextExtractor.getTextFromPage(pdf.getPage(2));
            assertThat(page1).contains("Reste chez les clients");
            assertThat(page1).contains("1/2");
            assertThat(page2).contains("2/2");
            assertThat(page2).contains("CR-100");
        }
    }
}
