package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.TontinePlannedDeliveriesPdfDto;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.service.report.PdfDocumentIdentity;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

/**
 * PDF des membres à livrer à une date prévue : commandes en attente ou validées, sans les membres
 * déjà livrés. Un commercial ne voit que ses propres commandes.
 */
@Service
@RequiredArgsConstructor
public class TontinePlannedDeliveriesPdfService {

    static final String DOCUMENT_TITLE = "Membres à livrer";
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final EnumSet<TontineMemberDeliveryStatus> NOT_DELIVERED =
            EnumSet.of(TontineMemberDeliveryStatus.PENDING, TontineMemberDeliveryStatus.VALIDATED);

    private final TontineDeliveryRepository deliveryRepository;
    private final UserService userService;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    @Transactional(readOnly = true)
    public byte[] generate(LocalDate plannedDate, String commercial) {
        TontinePlannedDeliveriesPdfDto doc = buildDto(plannedDate, commercial);
        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, DOCUMENT_TITLE);
        context.setVariable("doc", doc);
        String html = templateEngine.process("tontine-planned-deliveries", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(DOCUMENT_TITLE));
    }

    @Transactional(readOnly = true)
    public TontinePlannedDeliveriesPdfDto buildDto(LocalDate plannedDate, String commercial) {
        if (plannedDate == null) {
            throw new CustomValidationException("Choisissez la date de livraison prévue.");
        }
        String effectiveCommercial = effectiveCommercial(commercial);
        List<TontineDelivery> deliveries = new ArrayList<>(
                deliveryRepository.findPlannedForDate(plannedDate, NOT_DELIVERED, effectiveCommercial));
        deliveries.sort(Comparator
                .comparing((TontineDelivery d) -> text(d.getCommercialUsername()), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(d -> text(client(d) != null ? client(d).getQuarter() : null), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(d -> clientName(client(d)), String.CASE_INSENSITIVE_ORDER));

        NumberFormat money = NumberFormat.getNumberInstance(Locale.FRANCE);
        money.setMaximumFractionDigits(0);
        List<TontinePlannedDeliveriesPdfDto.Row> rows = new ArrayList<>();
        double total = 0;
        double totalDue = 0;
        int index = 1;
        for (TontineDelivery delivery : deliveries) {
            TontineOrderBalance balance = TontineOrderBalance.of(delivery);
            total += balance.orderTotal();
            totalDue += balance.amountDue();
            TontineMember member = delivery.getTontineMember();
            boolean validated = member.getDeliveryStatus() == TontineMemberDeliveryStatus.VALIDATED;
            rows.add(TontinePlannedDeliveriesPdfDto.Row.builder()
                    .index(index++)
                    .clientName(clientName(member.getClient()))
                    .clientContact(contact(member.getClient()))
                    .commercial(text(delivery.getCommercialUsername()))
                    .reference(text(delivery.getReference()))
                    .statusLabel(validated ? "Validée" : "En attente")
                    .validated(validated)
                    .items(items(delivery))
                    .totalAmount(money.format(Math.round(balance.orderTotal())))
                    .netContribution(money.format(Math.round(balance.netContribution())))
                    .amountDue(money.format(Math.round(balance.amountDue())))
                    .hasAmountDue(balance.amountDue() > 0)
                    .build());
        }

        return TontinePlannedDeliveriesPdfDto.builder()
                .plannedDate(plannedDate.format(DATE))
                .commercialLabel(effectiveCommercial != null ? effectiveCommercial : "Tous les commerciaux")
                .allCommercials(effectiveCommercial == null)
                .generationDate(LocalDateTime.now().format(DATE_TIME))
                .memberCount(rows.size())
                .totalAmount(money.format(Math.round(total)) + " FCFA")
                .totalAmountDue(money.format(Math.round(totalDue)) + " FCFA")
                .rows(rows)
                .build();
    }

    /** Un commercial ne télécharge que ses commandes, quel que soit le filtre envoyé. */
    private String effectiveCommercial(String requested) {
        User user = userService.getCurrentUser();
        if (user != null && user.is(UserProfilConstant.PROMOTER)) {
            return user.getUsername();
        }
        if (!StringUtils.hasText(requested) || "all".equalsIgnoreCase(requested.trim())) {
            return null;
        }
        return requested.trim();
    }

    private static List<String> items(TontineDelivery delivery) {
        if (delivery.getItems() == null) {
            return List.of();
        }
        return delivery.getItems().stream()
                .sorted(Comparator.comparing(TontineOrderReceiptPdfService::designation, String.CASE_INSENSITIVE_ORDER))
                .map((TontineDeliveryItem item) -> TontineOrderReceiptPdfService.displayQuantity(item) + " × "
                        + TontineOrderReceiptPdfService.designation(item))
                .toList();
    }

    private static Client client(TontineDelivery delivery) {
        return delivery.getTontineMember() != null ? delivery.getTontineMember().getClient() : null;
    }

    private static String clientName(Client client) {
        if (client == null) {
            return "—";
        }
        String name = Stream.of(client.getLastname(), client.getFirstname())
                .filter(StringUtils::hasText)
                .map(String::trim)
                .reduce((a, b) -> a + " " + b)
                .orElse("");
        return name.isEmpty() ? "—" : name;
    }

    private static String contact(Client client) {
        if (client == null) {
            return "";
        }
        return Stream.of(client.getPhone(), client.getQuarter(), client.getAddress())
                .filter(StringUtils::hasText)
                .map(String::trim)
                .reduce((a, b) -> a + " · " + b)
                .orElse("");
    }

    private static String text(String value) {
        return StringUtils.hasText(value) ? value.trim() : "";
    }
}
