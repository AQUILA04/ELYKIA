package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.sale.OrderItem;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.entity.stock.StockRequestOrderLink;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.enumaration.OrderSource;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import com.optimize.elykia.core.repository.OrderItemRepository;
import com.optimize.elykia.core.repository.OrderRepository;
import com.optimize.elykia.core.repository.StockRequestOrderLinkRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import com.optimize.elykia.core.service.customer.CustomerNotificationService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.sale.CreditService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.hibernate.Hibernate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.optimize.elykia.core.entity.sale.Credit;

import com.optimize.elykia.core.repository.OrderStatusHistoryRepository;

@Service
@Transactional
public class OrderService extends GenericService<Order, Long> {

    public static final List<StockRequestStatus> ACTIVE_STOCK_REQUEST_STATUSES = List.of(
            StockRequestStatus.CREATED,
            StockRequestStatus.VALIDATED,
            StockRequestStatus.DELIVERED);

    private final OrderItemRepository orderItemRepository;
    private final ClientService clientService;
    private final ArticlesService articlesService;
    private final OrderStatusHistoryService historyService;
    private final UserService userService;
    private final CreditService creditService;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final AppNotificationService appNotificationService;
    private final CustomerNotificationService customerNotificationService;
    private final StockRequestOrderLinkRepository stockRequestOrderLinkRepository;

    protected OrderService(OrderRepository repository,
            OrderItemRepository orderItemRepository,
            ClientService clientService,
            ArticlesService articlesService,
            OrderStatusHistoryService historyService,
            UserService userService,
            CreditService creditService,
            OrderStatusHistoryRepository orderStatusHistoryRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher,
            AppNotificationService appNotificationService,
            CustomerNotificationService customerNotificationService,
            StockRequestOrderLinkRepository stockRequestOrderLinkRepository) {
        super(repository);
        this.orderItemRepository = orderItemRepository;
        this.clientService = clientService;
        this.articlesService = articlesService;
        this.historyService = historyService;
        this.userService = userService;
        this.creditService = creditService;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.eventPublisher = eventPublisher;
        this.appNotificationService = appNotificationService;
        this.customerNotificationService = customerNotificationService;
        this.stockRequestOrderLinkRepository = stockRequestOrderLinkRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Order getById(Long id) {
        Order order = super.getById(id);
        if (order != null) {
            Hibernate.initialize(order.getItems());
            enrichActiveStockRequest(List.of(order));
        }
        return order;
    }

    public DashboardKpiDto getOrderKpis() {
        return getOrderKpis(null);
    }

    public DashboardKpiDto getOrderKpis(OrderSource source) {
        DashboardKpiDto dto = new DashboardKpiDto();
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime now = LocalDateTime.now();

        long pendingOrdersCount = source == null
                ? getRepository().countByStatus(OrderStatus.PENDING)
                : getRepository().countByStatusAndSource(OrderStatus.PENDING, source);
        dto.setPendingOrders(pendingOrdersCount);

        double potentialValue = source == null
                ? getRepository().sumTotalAmountByStatus(OrderStatus.PENDING)
                : getRepository().sumTotalAmountByStatusAndSource(OrderStatus.PENDING, source);
        dto.setPotentialValue(potentialValue);

        double acceptedPipelineValue = source == null
                ? getRepository().sumTotalAmountByStatus(OrderStatus.ACCEPTED)
                : getRepository().sumTotalAmountByStatusAndSource(OrderStatus.ACCEPTED, source);
        dto.setAcceptedPipelineValue(acceptedPipelineValue);

        long acceptedInPeriod;
        long deniedInPeriod;
        long cancelledInPeriod;
        double soldValueLast30Days;
        if (source == null) {
            acceptedInPeriod = orderStatusHistoryRepository
                    .countByNewStatusAndChangeTimestampBetween(OrderStatus.ACCEPTED, thirtyDaysAgo, now);
            deniedInPeriod = orderStatusHistoryRepository
                    .countByNewStatusAndChangeTimestampBetween(OrderStatus.DENIED, thirtyDaysAgo, now);
            cancelledInPeriod = orderStatusHistoryRepository
                    .countByNewStatusAndChangeTimestampBetween(OrderStatus.CANCEL, thirtyDaysAgo, now);
            soldValueLast30Days = orderStatusHistoryRepository
                    .sumTotalAmountForNewStatusBetween(OrderStatus.SOLD, thirtyDaysAgo, now);
        } else {
            acceptedInPeriod = orderStatusHistoryRepository
                    .countByNewStatusAndSourceAndChangeTimestampBetween(
                            OrderStatus.ACCEPTED, source, thirtyDaysAgo, now);
            deniedInPeriod = orderStatusHistoryRepository
                    .countByNewStatusAndSourceAndChangeTimestampBetween(
                            OrderStatus.DENIED, source, thirtyDaysAgo, now);
            cancelledInPeriod = orderStatusHistoryRepository
                    .countByNewStatusAndSourceAndChangeTimestampBetween(
                            OrderStatus.CANCEL, source, thirtyDaysAgo, now);
            soldValueLast30Days = orderStatusHistoryRepository
                    .sumTotalAmountForNewStatusAndSourceBetween(
                            OrderStatus.SOLD, source, thirtyDaysAgo, now);
        }
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

        dto.setSoldValueLast30Days(soldValueLast30Days);

        double potentialPurchaseValue = source == null
                ? getRepository().sumTotalPurchasePriceByStatus(OrderStatus.PENDING)
                : getRepository().sumTotalPurchasePriceByStatusAndSource(OrderStatus.PENDING, source);
        dto.setPotentialProfit(potentialValue - potentialPurchaseValue);

        return dto;
    }

    @Transactional
    public Credit soldOrder(Long orderId) throws Exception {
        Order order = super.getById(orderId);
        String username = userService.getCurrentUser().getUsername();

        if (order.getStatus() != OrderStatus.ACCEPTED) {
            throw new CustomValidationException("Seules les commandes acceptées peuvent être vendues.");
        }
        Long newCreditId = creditService.transformOrderToCredit(order);

        order.setStatus(OrderStatus.SOLD);
        super.update(order);
        historyService.createHistory(order, OrderStatus.ACCEPTED, OrderStatus.SOLD, username);
        clientService.updateOrderStatus(order.getClient().getId(), Boolean.FALSE);
        customerNotificationService.notifyOrderStatusChanged(order, OrderStatus.SOLD);
        return creditService.getById(newCreditId);
    }

    public List<Order> updateOrderStatus(UpdateOrderStatusDto dto) {
        User currentUser = userService.getCurrentUser();
        String username = currentUser.getUsername();
        List<Order> updatedOrders = new ArrayList<>();

        for (Long orderId : dto.getOrderIds()) {
            Order order = super.getById(orderId);
            assertOrderPortfolioAccess(currentUser, order);
            OrderStatus oldStatus = order.getStatus();
            OrderStatus newStatus = dto.getNewStatus();

            validateStatusTransition(oldStatus, newStatus);
            assertStatusChangeAllowed(currentUser, order, newStatus);

            order.setStatus(newStatus);
            Order updatedOrder = super.update(order);
            updatedOrders.add(updatedOrder);

            historyService.createHistory(updatedOrder, oldStatus, newStatus, username);

            if (oldStatus == OrderStatus.PENDING && newStatus != OrderStatus.PENDING) {
                appNotificationService.resolveByTypeAndEntityId(AppNotificationType.CUSTOMER_ORDER, orderId);
            }
            if (oldStatus != newStatus) {
                customerNotificationService.notifyOrderStatusChanged(updatedOrder, newStatus);
            }
        }

        return updatedOrders;
    }

    void validateStatusTransition(OrderStatus oldStatus, OrderStatus newStatus) {
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
        return getAllOrders(status, null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Order> getAllOrders(OrderStatus status, OrderSource source, Pageable pageable) {
        return getAllOrders(status, null, source, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Order> getAllOrders(
            OrderStatus status,
            List<OrderStatus> statuses,
            OrderSource source,
            String commercial,
            String search,
            Pageable pageable) {
        List<OrderStatus> effectiveStatuses = resolveStatuses(status, statuses);
        User currentUser = userService.getCurrentUser();
        // Chaîne vide, pas null : un paramètre String null est lié en bytea et Postgres refuse upper().
        String collector = "";
        if (AppNotificationService.isPromoterOnly(currentUser)) {
            collector = currentUser.getUsername();
        } else if (StringUtils.hasText(commercial)) {
            collector = commercial.trim();
        }
        String searchTerm = StringUtils.hasText(search) ? search.trim() : "";

        Page<Order> ordersPage = getRepository().searchOrders(
                effectiveStatuses, source, collector, searchTerm, pageable);
        ordersPage.getContent().forEach(order -> Hibernate.initialize(order.getItems()));
        enrichActiveStockRequest(ordersPage.getContent());
        return ordersPage;
    }

    private List<OrderStatus> resolveStatuses(OrderStatus status, List<OrderStatus> statuses) {
        if (statuses != null && !statuses.isEmpty()) {
            return statuses.stream().distinct().toList();
        }
        if (status != null) {
            return List.of(status);
        }
        return List.of(OrderStatus.PENDING);
    }

    @Override
    public boolean deleteSoft(Long id) throws ApplicationException {
        assertCanDeleteOrder(userService.getCurrentUser());
        return super.deleteSoft(id);
    }

    void assertStatusChangeAllowed(User user, Order order, OrderStatus newStatus) {
        if (newStatus == OrderStatus.DENIED) {
            assertCanDeny(user);
        }
        if (newStatus == OrderStatus.CANCEL) {
            assertCanCancel(user, order);
        }
    }

    private void assertCanDeny(User user) {
        boolean allowed = user != null && (
                user.is(UserProfilConstant.GESTIONNAIRE)
                        || user.is(UserProfilConstant.ADMIN)
                        || user.is(UserProfilConstant.SU));
        if (!allowed) {
            throw new CustomValidationException(
                    "Seuls le gestionnaire et l'administrateur peuvent refuser une commande.");
        }
    }

    private void assertCanCancel(User user, Order order) {
        String username = user != null ? user.getUsername() : null;
        if (!sameUser(username, order.getCreatedBy()) && !sameUser(username, orderCollector(order))) {
            throw new CustomValidationException(
                    "Seul le commercial qui a créé la commande, ou celui pour qui elle a été créée, peut l'annuler.");
        }
    }

    private void assertCanDeleteOrder(User user) {
        if (!hasPermission(user, UserPermissionConstant.DEL_ORDER)) {
            throw new CustomValidationException("Vous n'êtes pas autorisé à supprimer une commande.");
        }
    }

    private static boolean hasPermission(User user, String permission) {
        if (user == null || user.getPermissions() == null) {
            return false;
        }
        return user.getPermissions().stream().anyMatch(item -> permission.equals(item.getName()));
    }

    private static boolean sameUser(String username, String other) {
        return StringUtils.hasText(username) && StringUtils.hasText(other) && username.equalsIgnoreCase(other.trim());
    }

    private static String orderCollector(Order order) {
        Client client = order.getClient();
        return client != null ? client.getCollector() : null;
    }

    public Order createOrder(OrderDto dto) {
        return createOrder(dto, OrderSource.STAFF);
    }

    public Order createOrder(OrderDto dto, OrderSource source) {
        Client client = clientService.getById(dto.getClientId());

        Order order = new Order();
        order.setClient(client);
        order.setOrderDate(LocalDateTime.now());
        order.setStatus(OrderStatus.PENDING);
        order.setSource(source != null ? source : OrderSource.STAFF);
        order.setCreditPurpose(dto.getCreditPurpose() != null ? dto.getCreditPurpose() : com.optimize.elykia.core.enumaration.CreditPurpose.PERSONAL);

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

        Order savedOrder = super.create(order);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.OrderCreatedEvent(
                    this,
                    savedOrder.getTotalAmount(),
                    client.getCollector(),
                    savedOrder.getId()));
        }

        if (savedOrder.getSource() == OrderSource.CUSTOMER_SPACE) {
            appNotificationService.createCustomerOrder(savedOrder, client);
        }
        clientService.updateOrderStatus(client.getId(), Boolean.TRUE);

        return savedOrder;
    }

    void assertOrderPortfolioAccess(User user, Order order) {
        if (!AppNotificationService.isPromoterOnly(user)) {
            return;
        }
        Client client = order.getClient();
        String collector = client != null ? client.getCollector() : null;
        if (!AppNotificationService.matchesCreditCollector(user, collector)) {
            throw new CustomValidationException("Accès non autorisé à cette commande.");
        }
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

        return super.update(order);
    }

    private void enrichActiveStockRequest(List<Order> orders) {
        if (orders == null || orders.isEmpty() || stockRequestOrderLinkRepository == null) {
            return;
        }
        List<Long> orderIds = orders.stream().map(Order::getId).filter(id -> id != null).toList();
        if (orderIds.isEmpty()) {
            return;
        }
        List<StockRequestOrderLink> links = stockRequestOrderLinkRepository
                .findActiveByOrderIds(orderIds, ACTIVE_STOCK_REQUEST_STATUSES);
        Map<Long, StockRequestOrderLink> byOrderId = links.stream()
                .collect(Collectors.toMap(
                        link -> link.getOrder().getId(),
                        link -> link,
                        (first, second) -> first));
        for (Order order : orders) {
            StockRequestOrderLink link = byOrderId.get(order.getId());
            if (link != null && link.getStockRequest() != null) {
                order.setActiveStockRequest(ActiveStockRequestInfo.builder()
                        .id(link.getStockRequest().getId())
                        .reference(link.getStockRequest().getReference())
                        .status(link.getStockRequest().getStatus())
                        .build());
            }
        }
    }

    @Override
    public OrderRepository getRepository() {
        return (OrderRepository) repository;
    }
}
