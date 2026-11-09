package com.optimize.elykia.core.service.order;

import com.optimize.elykia.core.service.report.UnitPriceVisibility;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.OrderSheetPdfDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.sale.OrderItem;
import com.optimize.elykia.core.enumaration.OrderSource;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.service.report.PdfDocumentIdentity;
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
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
public class OrderSheetPdfService {

    static final String DOCUMENT_TITLE = "Fiche de commande";
    private static final DateTimeFormatter ORDER_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String EMPTY = "—";

    private final OrderService orderService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final TemplateEngine templateEngine;
    private final PdfHtmlRenderer pdfHtmlRenderer;

    @Transactional(readOnly = true)
    public byte[] generate(Long orderId) {
        Order order = orderService.getById(orderId);
        User currentUser = userService.getCurrentUser();
        orderService.assertOrderPortfolioAccess(currentUser, order);

        Context context = new Context();
        UnitPriceVisibility.apply(context);
        PdfDocumentIdentity.applyTo(context, DOCUMENT_TITLE);
        context.setVariable("doc", toDto(order));
        String html = templateEngine.process("order-sheet-export", context);
        return pdfHtmlRenderer.htmlToPdf(html, PdfDocumentIdentity.footerLabel(DOCUMENT_TITLE));
    }

    OrderSheetPdfDto toDto(Order order) {
        Client client = order.getClient();
        NumberFormat money = NumberFormat.getNumberInstance(Locale.FRANCE);
        money.setMaximumFractionDigits(0);
        money.setMinimumFractionDigits(0);

        List<OrderItem> items = order.getItems() == null
                ? List.of()
                : order.getItems().stream()
                .sorted(Comparator.comparing(item -> designation(item.getArticle()), String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<OrderSheetPdfDto.Line> lines = new ArrayList<>();
        int index = 1;
        for (OrderItem item : items) {
            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            double unitPrice = item.getUnitPrice() == null ? 0d : item.getUnitPrice();
            lines.add(OrderSheetPdfDto.Line.builder()
                    .index(index++)
                    .designation(designation(item.getArticle()))
                    .quantity(String.valueOf(quantity))
                    .unitPrice(formatMoney(money, unitPrice))
                    .lineAmount(formatMoney(money, unitPrice * quantity))
                    .build());
        }

        double total = order.getTotalAmount() == null ? 0d : order.getTotalAmount();
        String collector = client != null ? client.getCollector() : null;

        return OrderSheetPdfDto.builder()
                .reference("CMD-" + order.getId())
                .orderDate(order.getOrderDate() == null ? EMPTY : ORDER_DATE.format(order.getOrderDate()))
                .statusLabel(statusLabel(order.getStatus()))
                .sourceLabel(order.getSource() == OrderSource.CUSTOMER_SPACE ? "En ligne" : "Agence")
                .clientLastname(text(client != null ? client.getLastname() : null))
                .clientFirstname(text(client != null ? client.getFirstname() : null))
                .clientPhone(text(client != null ? client.getPhone() : null))
                .clientQuarter(text(client != null ? client.getQuarter() : null))
                .clientAddress(text(client != null ? client.getAddress() : null))
                .commercialLabel(commercialLabel(collector))
                .totalAmount(formatMoney(money, total))
                .lines(lines)
                .build();
    }

    static String statusLabel(OrderStatus status) {
        if (status == null) {
            return EMPTY;
        }
        return switch (status) {
            case PENDING -> "En attente";
            case ACCEPTED -> "Validée";
            case DENIED -> "Refusée";
            case CANCEL -> "Annulée";
            case SOLD -> "Livrée";
        };
    }

    private String commercialLabel(String username) {
        if (!StringUtils.hasText(username)) {
            return EMPTY;
        }
        String trimmed = username.trim();
        return userRepository.findByUserAccount_usernameIgnoreCase(trimmed)
                .map(this::formatUserName)
                .filter(StringUtils::hasText)
                .map(name -> name + " (" + trimmed + ")")
                .orElse(trimmed);
    }

    private String formatUserName(User user) {
        String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
        String last = user.getLastname() != null ? user.getLastname().trim() : "";
        return (first + " " + last).trim();
    }

    private String designation(Articles article) {
        if (article == null || !StringUtils.hasText(article.getName())) {
            return "Article";
        }
        String name = article.getName().trim();
        String marque = article.getMarque() == null ? "" : article.getMarque().trim();
        String model = article.getModel() == null ? "" : article.getModel().trim();
        String extra = (marque + " " + model).trim();
        if (!StringUtils.hasText(extra) || name.toLowerCase(Locale.ROOT).contains(extra.toLowerCase(Locale.ROOT))) {
            return name;
        }
        return name + " — " + extra;
    }

    private String formatMoney(NumberFormat money, double amount) {
        return money.format(Math.round(amount)) + " FCFA";
    }

    private String text(String value) {
        return StringUtils.hasText(value) ? value.trim() : EMPTY;
    }
}
