package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.entity.Articles;
import com.optimize.elykia.core.entity.Order;
import com.optimize.elykia.core.entity.OrderItem;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.repository.OrderItemRepository;
import com.optimize.elykia.core.repository.OrderRepository;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.sale.CreditService;
import org.hibernate.Hibernate; // CORRECTION : Import nécessaire
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.optimize.elykia.core.entity.Credit;

import com.optimize.elykia.core.repository.OrderStatusHistoryRepository;

@Service
@Transactional
public class OrderService extends GenericService<Order, Long> {

    private final OrderItemRepository orderItemRepository;
    private final ClientService clientService;
    private final ArticlesService articlesService;
    private final OrderStatusHistoryService historyService;
    private final UserService userService;
    private final CreditService creditService;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    protected OrderService(OrderRepository repository,
            OrderItemRepository orderItemRepository,
            ClientService clientService,
            ArticlesService articlesService,
            OrderStatusHistoryService historyService,
            UserService userService,
            CreditService creditService,
            OrderStatusHistoryRepository orderStatusHistoryRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.orderItemRepository = orderItemRepository;
        this.clientService = clientService;
        this.articlesService = articlesService;
        this.historyService = historyService;
        this.userService = userService;
        this.creditService = creditService;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public Order getById(Long id) {
        Order order = super.getById(id);
        if (order != null) {
            // CORRECTION : Force le chargement de la collection "items" pour la page de
            // détail.
            Hibernate.initialize(order.getItems());
        }
        return order;
    }

    public DashboardKpiDto getOrderKpis() {
        DashboardKpiDto dto = new DashboardKpiDto();
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime now = LocalDateTime.now();

        long pendingOrdersCount = getRepository().countByStatus(OrderStatus.PENDING);
        dto.setPendingOrdersCount(pendingOrdersCount);

        double potentialValue = getRepository().sumTotalAmountByStatus(OrderStatus.PENDING);
        dto.setPotentialValue(potentialValue);

        double acceptedPipelineValue = getRepository().sumTotalAmountByStatus(OrderStatus.ACCEPTED);
        dto.setAcceptedPipelineValue(acceptedPipelineValue);

        long acceptedInPeriod = orderStatusHistoryRepository
                .countByNewStatusAndChangeTimestampBetween(OrderStatus.ACCEPTED, thirtyDaysAgo, now);
        long deniedInPeriod = orderStatusHistoryRepository.countByNewStatusAndChangeTimestampBetween(OrderStatus.DENIED,
                thirtyDaysAgo, now);
        long cancelledInPeriod = orderStatusHistoryRepository
                .countByNewStatusAndChangeTimestampBetween(OrderStatus.CANCEL, thirtyDaysAgo, now);
        long totalProcessed = acceptedInPeriod + deniedInPeriod + cancelledInPeriod;

        if (totalProcessed > 0) {
            dto.setAcceptanceRate(((double) acceptedInPeriod / totalProcessed) * 100);
            dto.setDenialRate((((double) deniedInPeriod + cancelledInPeriod) / totalProcessed) * 100);
        } else {
            dto.setAcceptanceRate(0);
            dto.setDenialRate(0);
        }

        if (pendingOrdersCount > 0) {
            dto.setAverageOrderValue(potentialValue / pendingOrdersCount);
        } else {
            dto.setAverageOrderValue(0);
        }

        double soldValueLast30Days = orderStatusHistoryRepository.sumTotalAmountForNewStatusBetween(OrderStatus.SOLD,
                thirtyDaysAgo, now);
        dto.setSoldValueLast30Days(soldValueLast30Days);

        double potentialPurchaseValue = getRepository().sumTotalPurchasePriceByStatus(OrderStatus.PENDING);
        dto.setPotentialProfit(potentialValue - potentialPurchaseValue);

        return dto;
    }

    @Transactional
    public Credit soldOrder(Long orderId) throws Exception {
        Order order = getById(orderId);
        String username = userService.getCurrentUser().getUsername();

        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new CustomValidationException("Seules les commandes acceptées peuvent être vendues.");
        }
        Long newCreditId = creditService.transformOrderToCredit(order);

        order.setStatus(OrderStatus.SOLD);
        this.update(order);
        historyService.createHistory(order, OrderStatus.ACCEPTED, OrderStatus.SOLD, username);

        return creditService.getById(newCreditId);
    }

    public List<Order> updateOrderStatus(UpdateOrderStatusDto dto) {
        String username = userService.getCurrentUser().getUsername();
        List<Order> updatedOrders = new ArrayList<>();

        for (Long orderId : dto.getOrderIds()) {
            Order order = getById(orderId);
            OrderStatus oldStatus = order.getStatus();
            OrderStatus newStatus = dto.getNewStatus();

            validateStatusTransition(oldStatus, newStatus);

            order.setStatus(newStatus);
            Order updatedOrder = this.update(order);
            updatedOrders.add(updatedOrder);

            historyService.createHistory(updatedOrder, oldStatus, newStatus, username);
        }

        return updatedOrders;
    }

    private void validateStatusTransition(OrderStatus oldStatus, OrderStatus newStatus) {
        switch (oldStatus) {
            case PENDING:
                if (newStatus != OrderStatus.ACCEPTED && newStatus != OrderStatus.DENIED
                        && newStatus != OrderStatus.CANCEL) {
                    throw new CustomValidationException(
                            "Une commande en attente ne peut être qu'acceptée, refusée ou annulée.");
                }
                break;
            case ACCEPTED:
                if (newStatus != OrderStatus.SOLD) {
                    throw new CustomValidationException("Une commande acceptée ne peut que passer au statut 'vendu'.");
                }
                break;
            case DENIED:
            case CANCEL:
                if (newStatus != OrderStatus.PENDING) {
                    throw new CustomValidationException(
                            "Une commande refusée ou annulée ne peut que repasser en attente.");
                }
                break;
            default:
                throw new CustomValidationException("Transition de statut non autorisée depuis " + oldStatus);
        }
    }

    public Page<ArticleOrderSummaryDto> getAcceptedArticleSummary(String commercialUsername, Pageable pageable) {
        if (StringUtils.hasText(commercialUsername)) {
            return orderItemRepository.findAggregatedByArticleAndStatusAndCommercial(OrderStatus.ACCEPTED,
                    commercialUsername, pageable);
        } else {
            return orderItemRepository.findAggregatedByArticleAndStatus(OrderStatus.ACCEPTED, pageable);
        }
    }

    public List<RestockNeededDto> getRestockNeededReportData() {
        return orderItemRepository.findRestockNeeded();
    }

    @Transactional(readOnly = true)
    public Page<Order> getAllOrders(OrderStatus status, Pageable pageable) {
        OrderStatus finalStatus = (status == null) ? OrderStatus.PENDING : status;
        Page<Order> ordersPage = getRepository().findByStatus(finalStatus, pageable);

        // CORRECTION : Force le chargement de la collection "items" pour chaque
        // commande de la page.
        ordersPage.getContent().forEach(order -> Hibernate.initialize(order.getItems()));

        return ordersPage;
    }

    public Order createOrder(OrderDto dto) {
        Client client = clientService.getById(dto.getClientId());

        Order order = new Order();
        order.setClient(client);
        order.setOrderDate(LocalDateTime.now());
        order.setStatus(OrderStatus.PENDING);

        Set<OrderItem> items = new HashSet<>();
        double totalAmount = 0.0;
        double totalPurchasePrice = 0.0;

        for (OrderItemDto itemDto : dto.getItems()) {
            Articles article = articlesService.getById(itemDto.getArticleId());
            OrderItem item = new OrderItem();
            item.setArticle(article);
            item.setQuantity(itemDto.getQuantity());
            item.setUnitPrice(article.getCreditSalePrice());
            item.setOrder(order);
            items.add(item);
            totalAmount += item.getUnitPrice() * item.getQuantity();
            totalPurchasePrice += article.getPurchasePrice() * item.getQuantity();
        }

        order.setItems(items);
        order.setTotalAmount(totalAmount);
        order.setTotalPurchasePrice(totalPurchasePrice);

        Order savedOrder = this.create(order);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.OrderCreatedEvent(
                    this,
                    savedOrder.getTotalAmount(),
                    savedOrder.getCreatedBy(),
                    savedOrder.getId()));
        }

        return savedOrder;
    }

    public Order updatePendingOrder(Long orderId, OrderDto dto) {
        Order order = getById(orderId);

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new CustomValidationException("Seules les commandes en attente peuvent être modifiées.");
        }

        order.getItems().clear();

        Set<OrderItem> items = new HashSet<>();
        double totalAmount = 0.0;
        double totalPurchasePrice = 0.0;

        for (OrderItemDto itemDto : dto.getItems()) {
            Articles article = articlesService.getById(itemDto.getArticleId());
            OrderItem item = new OrderItem();
            item.setArticle(article);
            item.setQuantity(itemDto.getQuantity());
            item.setUnitPrice(article.getCreditSalePrice());
            item.setOrder(order);
            items.add(item);
            totalAmount += item.getUnitPrice() * item.getQuantity();
            totalPurchasePrice += article.getPurchasePrice() * item.getQuantity();
        }

        order.setItems(items);
        order.setTotalAmount(totalAmount);
        order.setTotalPurchasePrice(totalPurchasePrice);

        return this.update(order);
    }

    @Override
    public OrderRepository getRepository() {
        return (OrderRepository) repository;
    }
}
