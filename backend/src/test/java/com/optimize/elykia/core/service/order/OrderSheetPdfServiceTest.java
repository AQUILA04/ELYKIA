package com.optimize.elykia.core.service.order;

import com.optimize.common.entities.exception.CustomValidationException;
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
import com.optimize.elykia.core.service.report.PdfHtmlRenderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderSheetPdfServiceTest {

    @Mock private OrderService orderService;
    @Mock private UserService userService;
    @Mock private UserRepository userRepository;
    @Mock private TemplateEngine templateEngine;
    @Mock private PdfHtmlRenderer pdfHtmlRenderer;

    @InjectMocks
    private OrderSheetPdfService service;

    @Test
    void statusLabel_isAvailableForEveryStatus() {
        assertEquals("En attente", OrderSheetPdfService.statusLabel(OrderStatus.PENDING));
        assertEquals("Validée", OrderSheetPdfService.statusLabel(OrderStatus.ACCEPTED));
        assertEquals("Livrée", OrderSheetPdfService.statusLabel(OrderStatus.SOLD));
        assertEquals("Refusée", OrderSheetPdfService.statusLabel(OrderStatus.DENIED));
        assertEquals("Annulée", OrderSheetPdfService.statusLabel(OrderStatus.CANCEL));
    }

    @Test
    void toDto_describesClientCommercialAndLines() {
        when(userRepository.findByUserAccount_usernameIgnoreCase("com.a")).thenReturn(Optional.empty());

        OrderSheetPdfDto dto = service.toDto(sampleOrder(OrderStatus.SOLD));

        assertEquals("CMD-15", dto.getReference());
        assertEquals("Livrée", dto.getStatusLabel());
        assertEquals("En ligne", dto.getSourceLabel());
        assertEquals("KOFFI", dto.getClientLastname());
        assertEquals("Ama", dto.getClientFirstname());
        assertEquals("90112233", dto.getClientPhone());
        assertEquals("Tokoin", dto.getClientQuarter());
        assertEquals("Rue 12", dto.getClientAddress());
        assertEquals("com.a", dto.getCommercialLabel());
        assertEquals(1, dto.getLines().size());
        assertTrue(dto.getLines().get(0).getDesignation().contains("Congélateur"));
        assertTrue(dto.getTotalAmount().contains("FCFA"));
    }

    @Test
    void generate_stopsWhenPortfolioAccessIsDenied() {
        Order order = sampleOrder(OrderStatus.PENDING);
        User user = org.mockito.Mockito.mock(User.class);
        when(orderService.getById(15L)).thenReturn(order);
        when(userService.getCurrentUser()).thenReturn(user);
        doThrow(new CustomValidationException("Accès non autorisé à cette commande."))
                .when(orderService).assertOrderPortfolioAccess(user, order);

        assertThrows(CustomValidationException.class, () -> service.generate(15L));
        verify(pdfHtmlRenderer, never()).htmlToPdf(any(), any());
    }

    private Order sampleOrder(OrderStatus status) {
        Articles article = new Articles();
        article.setId(3L);
        article.setName("Congélateur");
        article.setMarque("Brand");
        article.setModel("X1");
        OrderItem item = new OrderItem();
        item.setArticle(article);
        item.setQuantity(1);
        item.setUnitPrice(150000d);

        Client client = new Client();
        client.setLastname("KOFFI");
        client.setFirstname("Ama");
        client.setPhone("90112233");
        client.setQuarter("Tokoin");
        client.setAddress("Rue 12");
        client.setCollector("com.a");

        Order order = new Order();
        order.setId(15L);
        order.setStatus(status);
        order.setSource(OrderSource.CUSTOMER_SPACE);
        order.setOrderDate(LocalDateTime.of(2026, 11, 7, 10, 30));
        order.setTotalAmount(150000d);
        order.setClient(client);
        order.setItems(Set.of(item));
        return order;
    }
}
