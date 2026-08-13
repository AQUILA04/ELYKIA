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
import com.optimize.elykia.core.service.report.PdfDocumentIdentity;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ClientListPdfService {

    static final String DOCUMENT_TITLE = "Fiche Client";
    private static final DateTimeFormatter GENERATION_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final UserRepository userRepository;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    @Transactional(readOnly = true)
    public byte[] generatePdf(String commercialUsername) {
        if (commercialUsername == null || commercialUsername.isBlank()) {
            throw new CustomValidationException("Un commercial doit être sélectionné pour exporter la fiche client.");
        }

        List<Client> clients = clientRepository.findAllEnabledClientsForCommercialExport(
                commercialUsername, ClientType.CLIENT, State.ENABLED);
        Map<String, Long> kpis = clientService.getClientKpis(commercialUsername);

        ClientListExportPdfDto dto = buildDto(commercialUsername, clients, kpis);

        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, DOCUMENT_TITLE);
        context.setVariable("doc", dto);
        String html = templateEngine.process("client-list-export", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(DOCUMENT_TITLE));
    }

    ClientListExportPdfDto buildDto(String commercialUsername, List<Client> clients, Map<String, Long> kpis) {
        List<ClientListExportPdfDto.QuarterGroup> groups = new ArrayList<>();
        Map<String, List<ClientListExportPdfDto.Row>> byQuarter = new LinkedHashMap<>();
        int index = 1;
        for (Client client : clients) {
            String quarter = (client.getQuarter() == null || client.getQuarter().isBlank())
                    ? "Non renseigné"
                    : client.getQuarter().trim();
            byQuarter.computeIfAbsent(quarter, key -> new ArrayList<>())
                    .add(ClientListExportPdfDto.Row.builder()
                            .index(index++)
                            .lastname(nullToEmpty(client.getLastname()))
                            .firstname(nullToEmpty(client.getFirstname()))
                            .phone(nullToEmpty(client.getPhone()))
                            .address(nullToEmpty(client.getAddress()))
                            .creditInProgress(Boolean.TRUE.equals(client.getCreditInProgress()))
                            .tontineMember(client.isTontineMember())
                            .build());
        }
        byQuarter.forEach((quarter, rows) -> groups.add(ClientListExportPdfDto.QuarterGroup.builder()
                .quarter(quarter)
                .clients(rows)
                .build()));

        return ClientListExportPdfDto.builder()
                .commercialLabel(resolveCommercialLabel(commercialUsername))
                .commercialUsername(commercialUsername)
                .generationDate(LocalDateTime.now().format(GENERATION_FORMAT))
                .totalRegistered(kpi(kpis, "totalRegistered"))
                .withActiveCredit(kpi(kpis, "withActiveCredit"))
                .tontineMembers(kpi(kpis, "tontineMembers"))
                .withoutCreditNorTontine(kpi(kpis, "withoutCreditNorTontine"))
                .clientCount(clients.size())
                .groups(groups)
                .build();
    }

    private String resolveCommercialLabel(String username) {
        return userRepository.findByUserAccount_usernameIgnoreCase(username)
                .map(this::formatUserName)
                .filter(name -> !name.isBlank())
                .map(name -> name + " (" + username + ")")
                .orElse(username);
    }

    private String formatUserName(User user) {
        String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
        String last = user.getLastname() != null ? user.getLastname().trim() : "";
        return (first + " " + last).trim();
    }

    private long kpi(Map<String, Long> kpis, String key) {
        Long value = kpis.get(key);
        return value != null ? value : 0L;
    }

    private String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
