package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.sale.OrderItem;
import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.entity.stock.StockRequestOrderLink;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.repository.OrderRepository;
import com.optimize.elykia.core.repository.StockRequestOrderLinkRepository;
import com.optimize.elykia.core.service.stock.StockRequestService;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderStockRequestService {

    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final StockRequestService stockRequestService;
    private final StockRequestOrderLinkRepository linkRepository;
    private final UserService userService;

    public List<StockRequest> createFromOrders(List<Long> orderIds, boolean forNextMonth) {
        if (orderIds == null || orderIds.isEmpty()) {
            throw new CustomValidationException("Au moins une commande est requise.");
        }
        List<Long> distinctIds = orderIds.stream().distinct().toList();
        User currentUser = userService.getCurrentUser();

        List<Order> orders = new ArrayList<>();
        for (Long orderId : distinctIds) {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new CustomValidationException("Commande introuvable: " + orderId));
            Hibernate.initialize(order.getItems());
            orderService.assertOrderPortfolioAccess(currentUser, order);
            validateEligible(order);
            orders.add(order);
        }

        Map<String, List<Order>> byCollector = orders.stream()
                .collect(Collectors.groupingBy(
                        order -> order.getClient().getCollector().trim(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<StockRequest> created = new ArrayList<>();
        for (Map.Entry<String, List<Order>> entry : byCollector.entrySet()) {
            created.add(createForCollector(entry.getKey(), entry.getValue(), forNextMonth));
        }
        return created;
    }

    private StockRequest createForCollector(String collector, List<Order> orders, boolean forNextMonth) {
        Map<Long, AggregatedItem> aggregated = new LinkedHashMap<>();
        for (Order order : orders) {
            if (order.getItems() == null) {
                continue;
            }
            for (OrderItem item : order.getItems()) {
                Articles article = item.getArticle();
                AggregatedItem agg = aggregated.computeIfAbsent(article.getId(), id -> new AggregatedItem(article));
                agg.quantity += item.getQuantity();
            }
        }
        if (aggregated.isEmpty()) {
            throw new CustomValidationException(
                    "Aucune ligne d'article à inclure dans la demande de stock pour " + collector + ".");
        }

        String note = "Commandes " + orders.stream()
                .map(o -> "CMD-" + o.getId())
                .collect(Collectors.joining(", "));

        StockRequest request = new StockRequest();
        request.setCollector(collector);
        request.setNote(note.length() > 255 ? note.substring(0, 252) + "..." : note);
        for (AggregatedItem agg : aggregated.values()) {
            StockRequestItem item = new StockRequestItem();
            item.setArticle(agg.article);
            item.setQuantity(agg.quantity);
            request.addItem(item);
        }

        StockRequest saved = stockRequestService.createRequest(request, forNextMonth);
        for (Order order : orders) {
            StockRequestOrderLink link = new StockRequestOrderLink();
            link.setStockRequest(saved);
            link.setOrder(order);
            linkRepository.save(link);
        }
        return saved;
    }

    private void validateEligible(Order order) {
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.ACCEPTED) {
            throw new CustomValidationException(
                    "Seules les commandes en attente ou validées peuvent générer une demande de stock (CMD-"
                            + order.getId() + ").");
        }
        Client client = order.getClient();
        if (client == null || !StringUtils.hasText(client.getCollector())) {
            throw new CustomValidationException(
                    "La commande CMD-" + order.getId() + " n'a pas de commercial associé.");
        }
        if (linkRepository.existsActiveForOrder(order.getId(), OrderService.ACTIVE_STOCK_REQUEST_STATUSES)) {
            throw new CustomValidationException(
                    "La commande CMD-" + order.getId()
                            + " est déjà liée à une demande de stock active.");
        }
    }

    private static final class AggregatedItem {
        private final Articles article;
        private int quantity;

        private AggregatedItem(Articles article) {
            this.article = article;
        }
    }
}
