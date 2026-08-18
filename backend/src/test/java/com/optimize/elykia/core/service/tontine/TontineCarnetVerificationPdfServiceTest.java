package com.optimize.elykia.core.service.tontine;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.CarnetVerificationExportPdfDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineCarnetVerificationPdfServiceTest {

    @Mock private TontineService tontineService;
    @Mock private TontineMemberRepository tontineMemberRepository;
    @Mock private TemplateEngine templateEngine;
    @Mock private UserService userService;

    private TontineCarnetVerificationPdfService service;

    @BeforeEach
    void setUp() {
        service = new TontineCarnetVerificationPdfService(
                tontineService, tontineMemberRepository, templateEngine, new PdfHtmlRenderer());
    }

    @Test
    void buildDtoSortsAlphabeticallyIgnoringAccents() {
        List<TontineMember> members = List.of(
                member(3L, "Émile", "Zinsou"),
                member(1L, "Ama", "Adjo"),
                member(2L, "Jean", "Adjo"));

        CarnetVerificationExportPdfDto dto = service.buildDto(false, null, 2026, members);

        assertThat(dto.getMemberCount()).isEqualTo(3);
        List<String> firstColumn = dto.getPages().get(0).getColumns().get(0)
                .stream().map(CarnetVerificationExportPdfDto.Row::getDisplayName).toList();
        assertThat(firstColumn).containsExactly("ADJO Ama", "ADJO Jean", "ZINSOU Émile");
    }

    @Test
    void exportRendersMultiPageNumbers() throws Exception {
        TontineSession session = new TontineSession();
        session.setYear(2026);
        session.setStatus(TontineSessionStatus.ACTIVE);
        session.setStartDate(LocalDate.of(2026, 2, 1));
        session.setEndDate(LocalDate.of(2026, 11, 30));
        when(tontineService.getActiveSession()).thenReturn(session);
        when(tontineService.getUserService()).thenReturn(userService);
        User user = new User();
        when(userService.getCurrentUser()).thenReturn(user);

        int count = CarnetVerificationColumnLayout.ITEMS_PER_PAGE + 5;
        List<TontineMember> members = new ArrayList<>();
        IntStream.rangeClosed(1, count).forEach(i -> members.add(member((long) i, "Prenom" + i, "Nom" + String.format("%03d", i))));
        when(tontineMemberRepository.findForCarnetVerificationExport(2026, true, null, State.ENABLED))
                .thenReturn(members);

        when(templateEngine.process(eq("tontine-carnet-verification-export"), any(Context.class))).thenAnswer(invocation -> {
            Context context = invocation.getArgument(1);
            CarnetVerificationExportPdfDto doc = (CarnetVerificationExportPdfDto) context.getVariable("doc");
            return """
                    <!DOCTYPE html>
                    <html>
                    <head><style>@page { size: A4; margin: 14mm 14mm 24mm 14mm; }</style></head>
                    <body>
                      <div style="page-break-after: always;">
                        <h1>%s</h1>
                        <p>%s membres</p>
                      </div>
                      <div>
                        <p>page suivante</p>
                      </div>
                    </body>
                    </html>
                    """.formatted(doc.getTitle(), doc.getMemberCount());
        });

        byte[] pdfBytes = service.export(true, null);

        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(2);
            String page1 = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            String page2 = PdfTextExtractor.getTextFromPage(pdf.getPage(2));
            assertThat(page1).contains("1/2");
            assertThat(page1).contains("Carnets vérifiés");
            assertThat(page2).contains("2/2");
        }
    }

    private static TontineMember member(Long id, String firstname, String lastname) {
        Client client = new Client();
        client.setId(id);
        client.setFirstname(firstname);
        client.setLastname(lastname);
        client.setCode("C" + id);
        TontineMember member = new TontineMember();
        member.setId(id);
        member.setClient(client);
        return member;
    }
}
