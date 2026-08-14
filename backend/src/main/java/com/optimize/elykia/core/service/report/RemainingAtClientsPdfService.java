package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.elykia.core.dto.report.RemainingAtClientsCreditDto;
import com.optimize.elykia.core.dto.report.RemainingAtClientsExportPdfDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RemainingAtClientsPdfService {

    static final String DOCUMENT_TITLE = "Reste chez le client";
    private static final DateTimeFormatter GENERATION_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final NumberFormat AMOUNT_FORMAT = NumberFormat.getNumberInstance(Locale.FRANCE);

    private final RemainingAtClientsService remainingAtClientsService;
    private final UserRepository userRepository;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    @Transactional(readOnly = true)
    public byte[] generatePdf(String commercialUsername, int year) {
        if (commercialUsername == null || commercialUsername.isBlank()) {
            throw new CustomValidationException("Un commercial doit être sélectionné pour exporter le PDF.");
        }

        List<RemainingAtClientsCreditDto> credits = remainingAtClientsService.findAll(commercialUsername, year);
        RemainingAtClientsService.Aggregate aggregate = remainingAtClientsService.loadAggregate(commercialUsername, year);

        RemainingAtClientsExportPdfDto dto = buildDto(commercialUsername, year, credits, aggregate);

        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, DOCUMENT_TITLE);
        context.setVariable("doc", dto);
        String html = templateEngine.process("remaining-at-clients-export", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(DOCUMENT_TITLE));
    }

    RemainingAtClientsExportPdfDto buildDto(
            String commercialUsername,
            int year,
            List<RemainingAtClientsCreditDto> credits,
            RemainingAtClientsService.Aggregate aggregate) {

        List<RemainingAtClientsExportPdfDto.Row> rows = new ArrayList<>();
        int index = 1;
        for (RemainingAtClientsCreditDto credit : credits) {
            rows.add(RemainingAtClientsExportPdfDto.Row.builder()
                    .index(index++)
                    .clientLastname(nullToEmpty(credit.clientLastname()))
                    .clientFirstname(nullToEmpty(credit.clientFirstname()))
                    .reference(nullToEmpty(credit.reference()))
                    .beginDate(credit.beginDate() != null ? credit.beginDate().format(DATE_FORMAT) : "")
                    .totalAmount(formatAmount(credit.totalAmount()))
                    .totalAmountRemaining(formatAmount(credit.totalAmountRemaining()))
                    .build());
        }

        return RemainingAtClientsExportPdfDto.builder()
                .commercialUsername(commercialUsername)
                .commercialLabel(resolveCommercialLabel(commercialUsername))
                .year(year)
                .generationDate(LocalDateTime.now().format(GENERATION_FORMAT))
                .salesCount(aggregate.salesCount())
                .totalRemainingAmount(aggregate.totalRemainingAmount())
                .rows(rows)
                .build();
    }

    private String resolveCommercialLabel(String username) {
        Optional<User> user = userRepository.findByUserAccount_usernameIgnoreCase(username);
        if (user.isEmpty()) {
            return username;
        }
        User u = user.get();
        String first = u.getFirstname() != null ? u.getFirstname().trim() : "";
        String last = u.getLastname() != null ? u.getLastname().trim() : "";
        String full = (first + " " + last).trim();
        return full.isEmpty() ? username : username + " — " + full;
    }

    private static String formatAmount(Double value) {
        double v = value != null ? value : 0.0;
        synchronized (AMOUNT_FORMAT) {
            return AMOUNT_FORMAT.format(Math.round(v));
        }
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
