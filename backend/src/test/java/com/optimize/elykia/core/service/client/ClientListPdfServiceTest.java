package com.optimize.elykia.core.service.client;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.ClientListExportPdfDto;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientListPdfServiceTest {

    @Mock private ClientRepository clientRepository;
    @Mock private ClientService clientService;
    @Mock private UserRepository userRepository;
    @Mock private TemplateEngine templateEngine;

    private ClientListPdfService service;

    @BeforeEach
    void setUp() {
        service = new ClientListPdfService(
                clientRepository, clientService, userRepository, templateEngine, new PdfHtmlRenderer());
    }

    @Test
    void generatePdfRejectsBlankCommercial() {
        assertThatThrownBy(() -> service.generatePdf("  "))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("commercial");
    }

    @Test
    void generatePdfRendersTitleCommercialAndGroupsByQuarter() throws Exception {
        Client beClient = client("Koffi", "Ama", "BE", "Rue 1", "90111111", true, false);
        Client tokoinClient = client("Mensah", "Jean", "TOKOIN", "Rue 2", "90222222", false, true);

        when(clientRepository.findAllEnabledClientsForCommercialExport("COM001", ClientType.CLIENT, State.ENABLED))
                .thenReturn(List.of(beClient, tokoinClient));
        when(clientService.getClientKpis("COM001")).thenReturn(Map.of(
                "totalRegistered", 2L,
                "withActiveCredit", 1L,
                "tontineMembers", 1L,
                "withoutCreditNorTontine", 0L));

        User user = new User();
        user.setFirstname("Kodjo");
        user.setLastname("Agbeko");
        when(userRepository.findByUserAccount_usernameIgnoreCase("COM001")).thenReturn(Optional.of(user));

        when(templateEngine.process(eq("client-list-export"), any(Context.class))).thenAnswer(invocation -> {
            Context context = invocation.getArgument(1);
            ClientListExportPdfDto doc = (ClientListExportPdfDto) context.getVariable("doc");
            return """
                    <!DOCTYPE html>
                    <html>
                    <head><style>@page { size: A4; margin: 14mm 14mm 24mm 14mm; }</style></head>
                    <body>
                      <h1>%s</h1>
                      <p>%s</p>
                      <p>KPI %s</p>
                    </body>
                    </html>
                    """.formatted(context.getVariable("pdfDocumentTitle"), doc.getCommercialLabel(), doc.getTotalRegistered());
        });

        byte[] pdfBytes = service.generatePdf("COM001");

        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        org.mockito.Mockito.verify(templateEngine).process(eq("client-list-export"), contextCaptor.capture());
        Context captured = contextCaptor.getValue();
        assertThat(captured.getVariable("pdfDocumentTitle")).isEqualTo("Fiche Client");
        assertThat(captured.getVariable("pdfCompanyName")).isEqualTo("AMENOUVEVE-YAVEH");

        ClientListExportPdfDto dto = (ClientListExportPdfDto) captured.getVariable("doc");
        assertThat(dto.getCommercialLabel()).isEqualTo("Kodjo Agbeko (COM001)");
        assertThat(dto.getGroups()).extracting(ClientListExportPdfDto.QuarterGroup::getQuarter)
                .containsExactly("BE", "TOKOIN");
        assertThat(dto.getGroups().get(0).getClients().get(0).isCreditInProgress()).isTrue();
        assertThat(dto.getGroups().get(1).getClients().get(0).isTontineMember()).isTrue();

        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            String text = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            assertThat(text).contains("Fiche Client");
            assertThat(text).contains("Kodjo Agbeko (COM001)");
            assertThat(text).contains("1/1");
        }
    }

    private Client client(String lastname, String firstname, String quarter, String address,
                          String phone, boolean credit, boolean tontine) {
        Client client = new Client();
        client.setLastname(lastname);
        client.setFirstname(firstname);
        client.setQuarter(quarter);
        client.setAddress(address);
        client.setPhone(phone);
        client.setCreditInProgress(credit);
        client.setTontineMember(tontine);
        return client;
    }
}
