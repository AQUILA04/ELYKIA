package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.PendingOrderStockPreviewDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.sale.OrderItem;
import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.entity.stock.StockRequestOrderLink;
import com.optimize.elykia.core.enumaration.OrderSource;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.repository.OrderRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import com.optimize.elykia.core.repository.StockRequestOrderLinkRepository;
import com.optimize.elykia.core.service.stock.StockRequestService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
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
        assertCanRequestStock(currentUser);

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

    public PendingOrderStockPreviewDto previewPending(OrderSource source) {
        List<PendingOrderStockPreviewDto.Group> groups = toPreviewGroups(loadEligiblePending(source));
        int orderCount = groups.stream().mapToInt(group -> group.getOrderIds().size()).sum();
        return PendingOrderStockPreviewDto.builder()
                .orderCount(orderCount)
                .groups(groups)
                .build();
    }

    public List<StockRequest> createFromPending(OrderSource source, boolean forNextMonth) {
        List<Order> orders = loadEligiblePending(source).stream()
                .filter(order -> order.getItems() != null && !order.getItems().isEmpty())
                .toList();
        if (orders.isEmpty()) {
            throw new CustomValidationException(
                    "Aucune commande en attente éligible pour une demande de stock.");
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

    private List<Order> loadEligiblePending(OrderSource source) {
        User currentUser = userService.getCurrentUser();
        assertCanRequestStock(currentUser);
        String collector = "";
        if (AppNotificationService.isPromoterOnly(currentUser)) {
            collector = currentUser.getUsername() == null ? "" : currentUser.getUsername().trim();
            if (!StringUtils.hasText(collector)) {
                throw new CustomValidationException("Commercial introuvable.");
            }
        }
        List<Order> found = orderRepository.findEligiblePendingForStockRequest(
                OrderStatus.PENDING,
                source,
                collector,
                OrderService.ACTIVE_STOCK_REQUEST_STATUSES);
        Map<Long, Order> unique = new LinkedHashMap<>();
        for (Order order : found) {
            if (order.getId() == null || order.getClient() == null
                    || !StringUtils.hasText(order.getClient().getCollector())) {
                continue;
            }
            if (StringUtils.hasText(collector)
                    && !collector.equalsIgnoreCase(order.getClient().getCollector().trim())) {
                continue;
            }
            if (order.getItems() != null) {
                Hibernate.initialize(order.getItems());
            }
            unique.putIfAbsent(order.getId(), order);
        }
        return new ArrayList<>(unique.values());
    }

    private List<PendingOrderStockPreviewDto.Group> toPreviewGroups(List<Order> orders) {
        Map<String, List<Order>> byCollector = orders.stream()
                .filter(order -> order.getItems() != null && !order.getItems().isEmpty())
                .collect(Collectors.groupingBy(
                        order -> order.getClient().getCollector().trim(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<PendingOrderStockPreviewDto.Group> groups = new ArrayList<>();
        for (Map.Entry<String, List<Order>> entry : byCollector.entrySet()) {
            Map<String, Integer> quantities = new LinkedHashMap<>();
            List<Long> orderIds = new ArrayList<>();
            for (Order order : entry.getValue()) {
                orderIds.add(order.getId());
                for (OrderItem item : order.getItems()) {
                    Articles article = item.getArticle();
                    String name = article != null && StringUtils.hasText(article.getName())
                            ? article.getName().trim()
                            : "Article";
                    int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
                    quantities.merge(name, quantity, Integer::sum);
                }
            }
            orderIds.sort(Comparator.naturalOrder());
            List<PendingOrderStockPreviewDto.ArticleLine> articles = quantities.entrySet().stream()
                    .map(article -> PendingOrderStockPreviewDto.ArticleLine.builder()
                            .name(article.getKey())
                            .quantity(article.getValue())
                            .build())
                    .toList();
            groups.add(PendingOrderStockPreviewDto.Group.builder()
                    .collector(entry.getKey())
                    .orderIds(orderIds)
                    .articles(articles)
                    .build());
        }
        groups.sort(Comparator.comparing(PendingOrderStockPreviewDto.Group::getCollector, String.CASE_INSENSITIVE_ORDER));
        return groups;
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

    private void assertCanRequestStock(User user) {
        boolean allowed = user != null && user.getPermissions() != null && user.getPermissions().stream()
                .anyMatch(permission -> UserPermissionConstant.ORDER_STOCK_REQUEST.equals(permission.getName()));
        if (!allowed) {
            throw new CustomValidationException(
                    "Vous n'êtes pas autorisé à créer une demande de stock depuis une commande.");
        }
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
