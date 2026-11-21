package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.TontineOrderReceiptPdfDto;
import com.optimize.elykia.core.dto.TontineOrderReceiptVerificationDto;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.core.entity.sale.SaleLinePricing;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.inventory.domain.SalePackMode;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.shared.pdf.PdfDocumentIdentity;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import com.optimize.elykia.shared.pdf.UnitPriceVisibility;
import com.optimize.elykia.core.service.tontine.conflict.TontineDeliveryConflictService;
import com.optimize.elykia.shared.security.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class TontineOrderReceiptPdfService {

    static final String DOCUMENT_TITLE = "Reçu de commande tontine";
    static final String UNKNOWN_MESSAGE = "Ce reçu ne provient pas d'Elykia.";
    private static final DateTimeFormatter ORDER_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter PLANNED_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String EMPTY = "—";

    private final TontineDeliveryRepository deliveryRepository;
    private final TontineDeliveryConflictService conflictService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    @Transactional(readOnly = true)
    public byte[] generate(Long deliveryId) {
        TontineDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Livraison non trouvée"));
        assertCanRead(delivery);

        Context context = new Context();
        // Commandes et livraisons tontine : même règle que les ventes comptant.
        UnitPriceVisibility.apply(context, OperationType.CASH);
        PdfDocumentIdentity.applyTo(context, DOCUMENT_TITLE);
        context.setVariable("doc", toDto(delivery));
        String html = templateEngine.process("tontine-order-receipt", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(DOCUMENT_TITLE));
    }

    @Transactional(readOnly = true)
    public TontineOrderReceiptVerificationDto verify(String rawCode) {
        if (!StringUtils.hasText(rawCode)) {
            return unknown();
        }
        String code = rawCode.trim().toUpperCase(Locale.ROOT).replace(" ", "");
        var direct = deliveryRepository.findByAuthenticityCode(code);
        if (direct.isPresent()) {
            return direct.filter(this::canRead)
                    .map(this::toVerification)
                    .orElseGet(TontineOrderReceiptPdfService::unknown);
        }
        // Reçu imprimé par un second téléphone dont la commande a été ajoutée à une commande existante.
        return conflictService.mergedDeliveryIdForReceiptCode(code)
                .flatMap(deliveryRepository::findById)
                .filter(this::canRead)
                .map(delivery -> {
                    TontineOrderReceiptVerificationDto verification = toVerification(delivery);
                    verification.setMessage(String.format(
                            "Ce reçu est authentique. La commande a été ajoutée à la commande %s, déjà enregistrée pour ce client : le détail ci-dessous est celui de la commande complète.",
                            delivery.getReference()));
                    return verification;
                })
                .orElseGet(TontineOrderReceiptPdfService::unknown);
    }

    TontineOrderReceiptPdfDto toDto(TontineDelivery delivery) {
        TontineMember member = delivery.getTontineMember();
        Client client = member != null ? member.getClient() : null;
        NumberFormat money = moneyFormat();
        List<TontineDeliveryItem> items = delivery.getItems() == null
                ? List.of()
                : delivery.getItems().stream()
                .sorted(Comparator.comparing(TontineOrderReceiptPdfService::designation, String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<TontineOrderReceiptPdfDto.Line> lines = new ArrayList<>();
        int index = 1;
        for (TontineDeliveryItem item : items) {
            lines.add(TontineOrderReceiptPdfDto.Line.builder()
                    .index(index++)
                    .designation(designation(item))
                    .quantity(String.valueOf(displayQuantity(item)))
                    .unitPrice(formatMoney(money, displayUnitPrice(item)))
                    .lineAmount(formatMoney(money, item.getTotalPrice() == null ? 0d : item.getTotalPrice()))
                    .build());
        }

        TontineSession session = member != null ? member.getTontineSession() : null;
        TontineOrderBalance balance = TontineOrderBalance.of(delivery);
        return TontineOrderReceiptPdfDto.builder()
                .reference(text(delivery.getReference()))
                .authenticityCode(text(delivery.getAuthenticityCode()))
                .orderDate(delivery.getRequestDate() == null ? EMPTY : ORDER_DATE.format(delivery.getRequestDate()))
                .plannedDeliveryDate(delivery.getPlannedDeliveryDate() == null ? null
                        : PLANNED_DATE.format(delivery.getPlannedDeliveryDate()))
                .statusLabel(statusLabel(member != null ? member.getDeliveryStatus() : null))
                .sessionYear(session != null && session.getYear() != null ? String.valueOf(session.getYear()) : EMPTY)
                .clientLastname(text(client != null ? client.getLastname() : null))
                .clientFirstname(text(client != null ? client.getFirstname() : null))
                .clientPhone(text(client != null ? client.getPhone() : null))
                .clientQuarter(text(client != null ? client.getQuarter() : null))
                .clientAddress(text(client != null ? client.getAddress() : null))
                .commercialLabel(commercialLabel(delivery.getCommercialUsername()))
                .totalAmount(formatMoney(money, delivery.getTotalAmount() == null ? 0d : delivery.getTotalAmount()))
                .delivered(balance.delivered())
                .netContribution(formatMoney(money, balance.netContribution()))
                .amountDue(formatMoney(money, balance.amountDue()))
                .hasAmountDue(balance.amountDue() > 0)
                .refundableBalance(formatMoney(money, balance.refundableBalance()))
                .lines(lines)
                .build();
    }

    static String statusLabel(TontineMemberDeliveryStatus status) {
        if (status == null) {
            return EMPTY;
        }
        return switch (status) {
            case PENDING -> "En attente";
            case VALIDATED -> "Validée";
            case DELIVERED -> "Livrée";
            case SESSION_INPROGRESS -> "Session en cours";
        };
    }

    private TontineOrderReceiptVerificationDto toVerification(TontineDelivery delivery) {
        TontineOrderReceiptPdfDto doc = toDto(delivery);
        Client client = delivery.getTontineMember() != null ? delivery.getTontineMember().getClient() : null;
        String clientName = client != null && StringUtils.hasText(client.getFullName())
                ? client.getFullName().trim()
                : (doc.getClientFirstname() + " " + doc.getClientLastname()).trim();
        return TontineOrderReceiptVerificationDto.builder()
                .found(true)
                .authenticityCode(doc.getAuthenticityCode())
                .reference(doc.getReference())
                .clientName(StringUtils.hasText(clientName) ? clientName : EMPTY)
                .clientPhone(doc.getClientPhone())
                .commercialUsername(doc.getCommercialLabel())
                .requestDate(doc.getOrderDate())
                .statusLabel(doc.getStatusLabel())
                .totalAmount(doc.getTotalAmount())
                .lines(doc.getLines())
                .build();
    }

    private void assertCanRead(TontineDelivery delivery) {
        if (!canRead(delivery)) {
            throw new CustomValidationException("Accès non autorisé à cette commande.");
        }
    }

    private boolean canRead(TontineDelivery delivery) {
        User currentUser = userService.getCurrentUser();
        if (currentUser == null || !currentUser.is(UserProfilConstant.PROMOTER)) {
            return currentUser != null;
        }
        String owner = delivery.getCommercialUsername();
        return StringUtils.hasText(owner)
                && owner.trim().equalsIgnoreCase(currentUser.getUsername());
    }

    private String commercialLabel(String username) {
        if (!StringUtils.hasText(username)) {
            return EMPTY;
        }
        String trimmed = username.trim();
        return userRepository.findByUserAccount_usernameIgnoreCase(trimmed)
                .map(user -> {
                    String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
                    String last = user.getLastname() != null ? user.getLastname().trim() : "";
                    String name = (first + " " + last).trim();
                    return StringUtils.hasText(name) ? name + " (" + trimmed + ")" : trimmed;
                })
                .orElse(trimmed);
    }

    /** Libellé d'une ligne : nom commercial de l'article, suivi du conditionnement pour un pack. */
    static String designation(TontineDeliveryItem item) {
        Articles article = item.getArticles();
        String name = article != null && StringUtils.hasText(article.getCommercialName())
                ? article.getCommercialName().trim()
                : (StringUtils.hasText(item.getArticleName()) ? item.getArticleName().trim() : EMPTY);
        SaleLinePricing line = item.getSaleLine();
        if (line != null && line.getSalePackMode() != null
                && line.getSalePackMode() != SalePackMode.UNIT
                && StringUtils.hasText(line.getPackLabel())) {
            return name + " — " + line.getPackLabel().trim();
        }
        return name;
    }

    /** Quantité affichée : nombre de packs pour une ligne en pack, sinon unités. */
    static int displayQuantity(TontineDeliveryItem item) {
        SaleLinePricing line = item.getSaleLine();
        if (isPack(line) && line.getPackCount() != null) {
            return line.getPackCount();
        }
        return item.getQuantity() == null ? 0 : item.getQuantity();
    }

    private double displayUnitPrice(TontineDeliveryItem item) {
        SaleLinePricing line = item.getSaleLine();
        if (isPack(line) && line.getPackPrice() != null) {
            return line.getPackPrice();
        }
        return item.getUnitPrice() == null ? 0d : item.getUnitPrice();
    }

    private static boolean isPack(SaleLinePricing line) {
        return line != null && line.getSalePackMode() != null && line.getSalePackMode() != SalePackMode.UNIT;
    }

    private NumberFormat moneyFormat() {
        NumberFormat money = NumberFormat.getNumberInstance(Locale.FRANCE);
        money.setMaximumFractionDigits(0);
        money.setMinimumFractionDigits(0);
        return money;
    }

    private String formatMoney(NumberFormat money, double amount) {
        return money.format(Math.round(amount)) + " FCFA";
    }

    private String text(String value) {
        return StringUtils.hasText(value) ? value.trim() : EMPTY;
    }

    private static TontineOrderReceiptVerificationDto unknown() {
        return TontineOrderReceiptVerificationDto.builder()
                .found(false)
                .message(UNKNOWN_MESSAGE)
                .lines(List.of())
                .build();
    }
}
