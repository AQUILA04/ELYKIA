package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.DashboardKpiDto;
import com.optimize.elykia.core.dto.OrderDto;
import com.optimize.elykia.core.dto.OrderItemDto;
import com.optimize.elykia.core.dto.UpdateOrderStatusDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.sale.OrderItem;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.event.OrderCreatedEvent;
import com.optimize.elykia.core.repository.OrderItemRepository;
import com.optimize.elykia.core.repository.OrderRepository;
import com.optimize.elykia.core.repository.OrderStatusHistoryRepository;
import com.optimize.elykia.core.service.sale.CreditService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private ClientService clientService;
    @Mock private ArticlesService articlesService;
    @Mock private OrderStatusHistoryService historyService;
    @Mock private UserService userService;
    @Mock private CreditService creditService;
    @Mock private OrderStatusHistoryRepository orderStatusHistoryRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private com.optimize.elykia.core.service.notification.AppNotificationService appNotificationService;
    @Mock private Client client;
    @Mock private User currentUser;

    @Test
    void createOrder_freezesArticleCreditPricesCalculatesTotalsAndNotifiesClientAndEventBus() {
        // Given
        OrderService service = service();
        Articles firstArticle = article(1L, 1_200.0, 700.0);
        Articles secondArticle = article(2L, 1_500.0, 900.0);
        OrderDto dto = orderDto(9L, item(1L, 2), item(2L, 1));
        when(clientService.getById(9L)).thenReturn(client);
        when(client.getId()).thenReturn(9L);
        when(client.getCollector()).thenReturn("commercial.a");
        when(articlesService.getById(1L)).thenReturn(firstArticle);
        when(articlesService.getById(2L)).thenReturn(secondArticle);
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId(71L);
            return saved;
        });
        ArgumentCaptor<OrderCreatedEvent> eventCaptor = ArgumentCaptor.forClass(OrderCreatedEvent.class);

        // When
        Order saved = service.createOrder(dto);

        // Then
        assertEquals(71L, saved.getId());
        assertSame(client, saved.getClient());
        assertEquals(OrderStatus.PENDING, saved.getStatus());
        assertEquals(3_900.0, saved.getTotalAmount());
        assertEquals(2_300.0, saved.getTotalPurchasePrice());
        assertEquals(2, saved.getItems().size());
        assertTrue(saved.getItems().stream().allMatch(orderItem -> orderItem.getOrder() == saved));
        assertEquals(1_200.0, saved.getItems().stream()
                .filter(orderItem -> orderItem.getArticle().getId().equals(1L)).findFirst().orElseThrow().getUnitPrice());
        verify(clientService).updateOrderStatus(9L, Boolean.TRUE);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals(3_900.0, eventCaptor.getValue().getAmount());
        assertEquals("commercial.a", eventCaptor.getValue().getCollector());
        assertEquals(71L, eventCaptor.getValue().getOrderId());
        verify(appNotificationService).createCustomerOrder(saved, client);
    }

    @Test
    void updateOrderStatus_pendingToAccepted_resolvesCustomerOrderNotification() {
        OrderService service = service();
        Order order = pendingOrder(31L, "commercial.a");
        User staff = staffUser("gestionnaire.a");
        when(userService.getCurrentUser()).thenReturn(staff);
        when(orderRepository.findById(31L)).thenReturn(Optional.of(order));
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateOrderStatusDto dto = new UpdateOrderStatusDto();
        dto.setOrderIds(List.of(31L));
        dto.setNewStatus(OrderStatus.ACCEPTED);

        List<Order> updated = service.updateOrderStatus(dto);

        assertEquals(1, updated.size());
        assertEquals(OrderStatus.ACCEPTED, updated.get(0).getStatus());
        verify(historyService).createHistory(order, OrderStatus.PENDING, OrderStatus.ACCEPTED, "gestionnaire.a");
        verify(appNotificationService).resolveByTypeAndEntityId(AppNotificationType.CUSTOMER_ORDER, 31L);
    }

    @Test
    void updateOrderStatus_rejectsForeignPromoter() {
        OrderService service = service();
        Order order = pendingOrder(31L, "commercial.other");
        User promoter = promoterUser("commercial.a");
        when(userService.getCurrentUser()).thenReturn(promoter);
        when(orderRepository.findById(31L)).thenReturn(Optional.of(order));

        UpdateOrderStatusDto dto = new UpdateOrderStatusDto();
        dto.setOrderIds(List.of(31L));
        dto.setNewStatus(OrderStatus.ACCEPTED);

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.updateOrderStatus(dto));
        assertTrue(exception.getMessage().contains("Accès non autorisé"));
        verify(appNotificationService, never()).resolveByTypeAndEntityId(any(), any());
        verify(historyService, never()).createHistory(any(), any(), any(), any());
    }

    @Test
    void updateOrderStatus_allowsMatchingPromoterAndResolvesNotification() {
        OrderService service = service();
        Order order = pendingOrder(44L, "commercial.a");
        User promoter = promoterUser("commercial.a");
        when(userService.getCurrentUser()).thenReturn(promoter);
        when(orderRepository.findById(44L)).thenReturn(Optional.of(order));
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateOrderStatusDto dto = new UpdateOrderStatusDto();
        dto.setOrderIds(List.of(44L));
        dto.setNewStatus(OrderStatus.DENIED);

        List<Order> updated = service.updateOrderStatus(dto);

        assertEquals(OrderStatus.DENIED, updated.get(0).getStatus());
        verify(appNotificationService).resolveByTypeAndEntityId(AppNotificationType.CUSTOMER_ORDER, 44L);
    }

    @Test
    void getAllOrders_usesCollectorFilterForPromoter() {
        OrderService service = service();
        Pageable pageable = PageRequest.of(0, 10);
        Order order = pendingOrder(9L, "commercial.a");
        Page<Order> page = new PageImpl<>(List.of(order), pageable, 1);
        User promoter = promoterUser("commercial.a");
        when(userService.getCurrentUser()).thenReturn(promoter);
        when(orderRepository.findByStatusAndClientCollector(OrderStatus.PENDING, "commercial.a", pageable))
                .thenReturn(page);

        Page<Order> result = service.getAllOrders(null, pageable);

        assertEquals(1, result.getTotalElements());
        verify(orderRepository).findByStatusAndClientCollector(OrderStatus.PENDING, "commercial.a", pageable);
        verify(orderRepository, never()).findByStatus(any(), any());
    }

    @Test
    void getAllOrders_usesStatusFilterForStaff() {
        OrderService service = service();
        Pageable pageable = PageRequest.of(0, 10);
        Order order = pendingOrder(9L, "commercial.a");
        Page<Order> page = new PageImpl<>(List.of(order), pageable, 1);
        User staff = staffUser("secretary.a");
        when(userService.getCurrentUser()).thenReturn(staff);
        when(orderRepository.findByStatus(OrderStatus.ACCEPTED, pageable)).thenReturn(page);

        Page<Order> result = service.getAllOrders(OrderStatus.ACCEPTED, pageable);

        assertEquals(1, result.getTotalElements());
        verify(orderRepository).findByStatus(OrderStatus.ACCEPTED, pageable);
        verify(orderRepository, never()).findByStatusAndClientCollector(any(), any(), any());
    }

    @Test
    void getOrderKpis_zeroProcessedAndNoPending_setsRatesAndAverageToZero() {
        OrderService service = service();
        when(orderRepository.countByStatus(OrderStatus.PENDING)).thenReturn(0L);
        when(orderRepository.sumTotalAmountByStatus(OrderStatus.PENDING)).thenReturn(0.0);
        when(orderRepository.sumTotalAmountByStatus(OrderStatus.ACCEPTED)).thenReturn(0.0);
        when(orderRepository.sumTotalPurchasePriceByStatus(OrderStatus.PENDING)).thenReturn(0.0);
        when(orderStatusHistoryRepository.countByNewStatusAndChangeTimestampBetween(eq(OrderStatus.ACCEPTED), any(), any()))
                .thenReturn(0L);
        when(orderStatusHistoryRepository.countByNewStatusAndChangeTimestampBetween(eq(OrderStatus.DENIED), any(), any()))
                .thenReturn(0L);
        when(orderStatusHistoryRepository.countByNewStatusAndChangeTimestampBetween(eq(OrderStatus.CANCEL), any(), any()))
                .thenReturn(0L);
        when(orderStatusHistoryRepository.sumTotalAmountForNewStatusBetween(eq(OrderStatus.SOLD), any(), any()))
                .thenReturn(0.0);

        DashboardKpiDto kpis = service.getOrderKpis();

        assertEquals(0, kpis.getPendingOrders());
        assertEquals(0.0, kpis.getAcceptanceRate());
        assertEquals(0.0, kpis.getDenialRate());
        assertEquals(0.0, kpis.getAverageOrderValue());
    }

    @Test
    void getAcceptedArticleSummary_routesByCommercialFilter() {
        OrderService service = service();
        Pageable pageable = PageRequest.of(0, 5);
        when(orderItemRepository.findAggregatedByArticleAndStatusAndCommercial(
                OrderStatus.ACCEPTED, "commercial.a", pageable)).thenReturn(Page.empty(pageable));
        when(orderItemRepository.findAggregatedByArticleAndStatus(OrderStatus.ACCEPTED, pageable))
                .thenReturn(Page.empty(pageable));

        assertTrue(service.getAcceptedArticleSummary("commercial.a", pageable).isEmpty());
        assertTrue(service.getAcceptedArticleSummary("  ", pageable).isEmpty());
        verify(orderItemRepository).findAggregatedByArticleAndStatusAndCommercial(
                OrderStatus.ACCEPTED, "commercial.a", pageable);
        verify(orderItemRepository).findAggregatedByArticleAndStatus(OrderStatus.ACCEPTED, pageable);
    }

    @Test
    void soldOrder_transformsOnlyAcceptedOrderAndUpdatesHistoryClientAndCreditState() throws Exception {
        // Given
        OrderService service = service();
        Order order = new Order();
        order.setId(31L);
        order.setStatus(OrderStatus.ACCEPTED);
        order.setClient(client);
        when(client.getId()).thenReturn(9L);
        Credit credit = new Credit();
        credit.setId(501L);
        when(orderRepository.findById(31L)).thenReturn(Optional.of(order));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");
        when(creditService.transformOrderToCredit(order)).thenReturn(501L);
        when(creditService.getById(501L)).thenReturn(credit);

        // When
        Credit returned = service.soldOrder(31L);

        // Then
        assertSame(credit, returned);
        assertEquals(OrderStatus.SOLD, order.getStatus());
        verify(historyService).createHistory(order, OrderStatus.ACCEPTED, OrderStatus.SOLD, "gestionnaire.a");
        verify(clientService).updateOrderStatus(9L, Boolean.FALSE);
    }

    @Test
    void soldOrder_rejectsPendingOrderBeforeCreditTransformationOrClientMutation() {
        // Given
        OrderService service = service();
        Order order = new Order();
        order.setStatus(OrderStatus.PENDING);
        when(orderRepository.findById(31L)).thenReturn(Optional.of(order));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gestionnaire.a");

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class, () -> service.soldOrder(31L));

        // Then
        assertTrue(exception.getMessage().contains("acceptées"));
        verify(creditService, never()).transformOrderToCredit(any());
        verify(historyService, never()).createHistory(any(), any(), any(), any());
        verify(clientService, never()).updateOrderStatus(any(), any());
    }

    @Test
    void getOrderKpis_calculatesPipelineRatesAverageOrderAndPotentialProfit() {
        // Given
        OrderService service = service();
        when(orderRepository.countByStatus(OrderStatus.PENDING)).thenReturn(4L);
        when(orderRepository.sumTotalAmountByStatus(OrderStatus.PENDING)).thenReturn(8_000.0);
        when(orderRepository.sumTotalAmountByStatus(OrderStatus.ACCEPTED)).thenReturn(3_000.0);
        when(orderRepository.sumTotalPurchasePriceByStatus(OrderStatus.PENDING)).thenReturn(5_000.0);
        when(orderStatusHistoryRepository.countByNewStatusAndChangeTimestampBetween(eq(OrderStatus.ACCEPTED), any(), any()))
                .thenReturn(6L);
        when(orderStatusHistoryRepository.countByNewStatusAndChangeTimestampBetween(eq(OrderStatus.DENIED), any(), any()))
                .thenReturn(2L);
        when(orderStatusHistoryRepository.countByNewStatusAndChangeTimestampBetween(eq(OrderStatus.CANCEL), any(), any()))
                .thenReturn(2L);
        when(orderStatusHistoryRepository.sumTotalAmountForNewStatusBetween(eq(OrderStatus.SOLD), any(), any()))
                .thenReturn(12_500.0);

        // When
        DashboardKpiDto kpis = service.getOrderKpis();

        // Then
        assertEquals(4, kpis.getPendingOrders());
        assertEquals(8_000.0, kpis.getPotentialValue());
        assertEquals(3_000.0, kpis.getAcceptedPipelineValue());
        assertEquals(60.0, kpis.getAcceptanceRate());
        assertEquals(40.0, kpis.getDenialRate());
        assertEquals(2_000.0, kpis.getAverageOrderValue());
        assertEquals(12_500.0, kpis.getSoldValueLast30Days());
        assertEquals(3_000.0, kpis.getPotentialProfit());
    }

    private OrderService service() {
        return new OrderService(orderRepository, orderItemRepository, clientService, articlesService, historyService,
                userService, creditService, orderStatusHistoryRepository, eventPublisher, appNotificationService);
    }

    private Articles article(Long id, double creditSalePrice, double purchasePrice) {
        Articles article = new Articles();
        article.setId(id);
        article.setCreditSalePrice(creditSalePrice);
        article.setPurchasePrice(purchasePrice);
        return article;
    }

    private OrderDto orderDto(Long clientId, OrderItemDto... items) {
        OrderDto dto = new OrderDto();
        dto.setClientId(clientId);
        dto.setItems(new LinkedHashSet<>(Set.of(items)));
        return dto;
    }

    private OrderItemDto item(Long articleId, int quantity) {
        OrderItemDto item = new OrderItemDto();
        item.setArticleId(articleId);
        item.setQuantity(quantity);
        return item;
    }

    private Order pendingOrder(Long id, String collector) {
        Order order = new Order();
        order.setId(id);
        order.setStatus(OrderStatus.PENDING);
        order.setItems(new HashSet<>());
        Client orderClient = new Client();
        orderClient.setId(9L);
        orderClient.setCollector(collector);
        order.setClient(orderClient);
        return order;
    }

    private User staffUser(String username) {
        User user = mock(User.class);
        lenient().when(user.getUsername()).thenReturn(username);
        lenient().when(user.is(UserProfilConstant.SECRETARY)).thenReturn(true);
        lenient().when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        lenient().when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        return user;
    }

    private User promoterUser(String username) {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn(username);
        lenient().when(user.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        lenient().when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        lenient().when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        return user;
    }
}
