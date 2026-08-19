package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.DashboardKpiDto;
import com.optimize.elykia.core.dto.OrderDto;
import com.optimize.elykia.core.dto.OrderItemDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.sale.OrderItem;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.event.OrderCreatedEvent;
import com.optimize.elykia.core.repository.OrderItemRepository;
import com.optimize.elykia.core.repository.OrderRepository;
import com.optimize.elykia.core.repository.OrderStatusHistoryRepository;
import com.optimize.elykia.core.service.sale.CreditService;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
                userService, creditService, orderStatusHistoryRepository, eventPublisher);
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
}
