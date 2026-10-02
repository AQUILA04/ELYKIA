package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.sale.OrderItem;
import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockRequestOrderLink;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.repository.OrderRepository;
import com.optimize.elykia.core.repository.StockRequestOrderLinkRepository;
import com.optimize.elykia.core.service.stock.StockRequestService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderStockRequestServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderService orderService;
    @Mock private StockRequestService stockRequestService;
    @Mock private StockRequestOrderLinkRepository linkRepository;
    @Mock private UserService userService;

    @InjectMocks
    private OrderStockRequestService service;

    @Test
    void createFromOrders_groupsByCollectorAndSumsQuantities() {
        User staff = staffUser();
        when(userService.getCurrentUser()).thenReturn(staff);

        Articles articleA = article(1L);
        Articles articleB = article(2L);
        Order order1 = order(10L, OrderStatus.PENDING, "commercial.a",
                item(articleA, 2), item(articleB, 1));
        Order order2 = order(11L, OrderStatus.ACCEPTED, "commercial.a",
                item(articleA, 3));
        Order order3 = order(12L, OrderStatus.PENDING, "commercial.b",
                item(articleA, 1));

        when(orderRepository.findById(10L)).thenReturn(Optional.of(order1));
        when(orderRepository.findById(11L)).thenReturn(Optional.of(order2));
        when(orderRepository.findById(12L)).thenReturn(Optional.of(order3));
        when(linkRepository.existsActiveForOrder(eq(10L), any())).thenReturn(false);
        when(linkRepository.existsActiveForOrder(eq(11L), any())).thenReturn(false);
        when(linkRepository.existsActiveForOrder(eq(12L), any())).thenReturn(false);

        when(stockRequestService.createRequest(any(StockRequest.class), eq(false)))
                .thenAnswer(invocation -> {
                    StockRequest req = invocation.getArgument(0);
                    req.setId(req.getCollector().equals("commercial.a") ? 100L : 200L);
                    req.setReference("REQ-" + req.getId());
                    return req;
                });
        when(linkRepository.save(any(StockRequestOrderLink.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        List<StockRequest> created = service.createFromOrders(List.of(10L, 11L, 12L), false);

        assertEquals(2, created.size());
        verify(stockRequestService, times(2)).createRequest(any(StockRequest.class), eq(false));
        verify(linkRepository, times(3)).save(any(StockRequestOrderLink.class));

        ArgumentCaptor<StockRequest> requestCaptor = ArgumentCaptor.forClass(StockRequest.class);
        verify(stockRequestService, times(2)).createRequest(requestCaptor.capture(), eq(false));
        StockRequest forA = requestCaptor.getAllValues().stream()
                .filter(r -> "commercial.a".equals(r.getCollector())).findFirst().orElseThrow();
        assertEquals(2, forA.getItems().size());
        int qtyA = forA.getItems().stream()
                .filter(i -> i.getArticle().getId().equals(1L)).findFirst().orElseThrow().getQuantity();
        int qtyB = forA.getItems().stream()
                .filter(i -> i.getArticle().getId().equals(2L)).findFirst().orElseThrow().getQuantity();
        assertEquals(5, qtyA);
        assertEquals(1, qtyB);
        assertTrue(forA.getNote().contains("CMD-10"));
        assertTrue(forA.getNote().contains("CMD-11"));
    }

    @Test
    void createFromOrders_rejectsNonEligibleStatus() {
        User staff = staffUser();
        when(userService.getCurrentUser()).thenReturn(staff);
        Order sold = order(5L, OrderStatus.SOLD, "commercial.a", item(article(1L), 1));
        when(orderRepository.findById(5L)).thenReturn(Optional.of(sold));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> service.createFromOrders(List.of(5L), false));
        assertTrue(ex.getMessage().contains("en attente ou validées"));
        verify(stockRequestService, never()).createRequest(any(), anyBoolean());
    }

    @Test
    void createFromOrders_rejectsWhenActiveStockRequestExists() {
        User staff = staffUser();
        when(userService.getCurrentUser()).thenReturn(staff);
        Order pending = order(5L, OrderStatus.PENDING, "commercial.a", item(article(1L), 1));
        when(orderRepository.findById(5L)).thenReturn(Optional.of(pending));
        when(linkRepository.existsActiveForOrder(eq(5L), any())).thenReturn(true);

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> service.createFromOrders(List.of(5L), false));
        assertTrue(ex.getMessage().contains("déjà liée"));
        verify(stockRequestService, never()).createRequest(any(), anyBoolean());
    }

    private User staffUser() {
        return org.mockito.Mockito.mock(User.class);
    }

    private Articles article(Long id) {
        Articles article = new Articles();
        article.setId(id);
        article.setName("Art-" + id);
        article.setCreditSalePrice(1000.0);
        article.setPurchasePrice(500.0);
        return article;
    }

    private OrderItem item(Articles article, int quantity) {
        OrderItem item = new OrderItem();
        item.setArticle(article);
        item.setQuantity(quantity);
        item.setUnitPrice(article.getCreditSalePrice());
        return item;
    }

    private Order order(Long id, OrderStatus status, String collector, OrderItem... items) {
        Order order = new Order();
        order.setId(id);
        order.setStatus(status);
        Client client = new Client();
        client.setId(id);
        client.setCollector(collector);
        order.setClient(client);
        Set<OrderItem> set = new HashSet<>();
        for (OrderItem item : items) {
            item.setOrder(order);
            set.add(item);
        }
        order.setItems(set);
        return order;
    }
}
