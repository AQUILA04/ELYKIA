package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.TontinePlannedDeliveriesPdfDto;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.shared.pdf.PdfDocumentIdentity;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TontinePlannedDeliveriesPdfServiceTest {

    private static final LocalDate DATE = LocalDate.of(2026, 12, 15);

    @Mock
    private TontineDeliveryRepository deliveryRepository;
    @Mock
    private UserService userService;

    private TemplateEngine engine;
    private TontinePlannedDeliveriesPdfService service;

    @BeforeEach
    void setUp() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        engine = new org.thymeleaf.spring6.SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        service = new TontinePlannedDeliveriesPdfService(deliveryRepository, userService, engine, new PdfHtmlRenderer());
    }

    @Test
    void listsOnlyNotYetDeliveredOrdersSortedByCommercialQuarterAndName() {
        givenManager();
        when(deliveryRepository.findPlannedForDate(eq(DATE), anyCollection(), isNull())).thenReturn(List.of(
                delivery("COM005", "Tokoin", "ZINSOU", TontineMemberDeliveryStatus.VALIDATED, 30_000, 40_000),
                delivery("COM005", "Bè", "AMOUZOU", TontineMemberDeliveryStatus.PENDING, 55_000, 40_000),
                delivery("COM001", "Tokoin", "KOFFI", TontineMemberDeliveryStatus.PENDING, 20_000, 20_000)));

        TontinePlannedDeliveriesPdfDto doc = service.buildDto(DATE, null);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<TontineMemberDeliveryStatus>> statuses = ArgumentCaptor.forClass(Collection.class);
        verify(deliveryRepository).findPlannedForDate(eq(DATE), statuses.capture(), isNull());
        assertTrue(statuses.getValue().contains(TontineMemberDeliveryStatus.PENDING));
        assertTrue(statuses.getValue().contains(TontineMemberDeliveryStatus.VALIDATED));
        assertFalse(statuses.getValue().contains(TontineMemberDeliveryStatus.DELIVERED));

        assertEquals("15/12/2026", doc.getPlannedDate());
        assertTrue(doc.isAllCommercials());
        assertEquals(3, doc.getMemberCount());
        assertEquals(List.of("KOFFI Ama", "AMOUZOU Ama", "ZINSOU Ama"),
                doc.getRows().stream().map(TontinePlannedDeliveriesPdfDto.Row::getClientName).toList());
        TontinePlannedDeliveriesPdfDto.Row due = doc.getRows().get(1);
        assertTrue(due.isHasAmountDue());
        assertEquals(List.of("2 × Riz 25 kg"), due.getItems());
        assertEquals("En attente", due.getStatusLabel());
        assertEquals("Validée", doc.getRows().get(2).getStatusLabel());
        assertFalse(doc.getRows().get(2).isHasAmountDue());
    }

    @Test
    void aCommercialOnlyGetsHisOwnOrders() {
        User commercial = mock(User.class);
        when(commercial.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(commercial.getUsername()).thenReturn("COM005");
        when(userService.getCurrentUser()).thenReturn(commercial);
        when(deliveryRepository.findPlannedForDate(eq(DATE), anyCollection(), eq("COM005"))).thenReturn(List.of());

        TontinePlannedDeliveriesPdfDto doc = service.buildDto(DATE, "COM001");

        assertEquals("COM005", doc.getCommercialLabel());
        assertFalse(doc.isAllCommercials());
        assertEquals(0, doc.getMemberCount());
    }

    @Test
    void aManagerCanFilterOnOneCommercial() {
        givenManager();
        when(deliveryRepository.findPlannedForDate(eq(DATE), anyCollection(), eq("COM001"))).thenReturn(List.of());

        assertEquals("COM001", service.buildDto(DATE, " COM001 ").getCommercialLabel());
        assertTrue(service.buildDto(DATE, "all").isAllCommercials());
    }

    @Test
    void theDateIsRequired() {
        assertThrows(CustomValidationException.class, () -> service.buildDto(null, null));
        verifyNoInteractions(deliveryRepository);
    }

    @Test
    void rendersTheListAsPdf() {
        givenManager();
        when(deliveryRepository.findPlannedForDate(eq(DATE), anyCollection(), isNull())).thenReturn(List.of(
                delivery("COM005", "Bè", "AMOUZOU", TontineMemberDeliveryStatus.PENDING, 55_000, 40_000)));

        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, TontinePlannedDeliveriesPdfService.DOCUMENT_TITLE);
        context.setVariable("doc", service.buildDto(DATE, null));
        String html = engine.process("tontine-planned-deliveries", context);
        assertTrue(html.contains("AMOUZOU Ama"));
        assertTrue(html.contains("Livraison prévue le"));
        assertTrue(html.contains("2 × Riz 25 kg"));

        byte[] pdf = service.generate(DATE, null);
        assertEquals("%PDF", new String(pdf, 0, 4));
    }

    @Test
    void rendersAnEmptyDay() {
        givenManager();
        when(deliveryRepository.findPlannedForDate(eq(DATE), anyCollection(), isNull())).thenReturn(List.of());

        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, TontinePlannedDeliveriesPdfService.DOCUMENT_TITLE);
        context.setVariable("doc", service.buildDto(DATE, null));
        String html = engine.process("tontine-planned-deliveries", context);

        assertTrue(html.contains("Aucune commande n'est prévue à cette date"));
    }

    private void givenManager() {
        User manager = mock(User.class);
        lenient().when(manager.is(anyString())).thenReturn(false);
        when(userService.getCurrentUser()).thenReturn(manager);
    }

    private static TontineDelivery delivery(String commercial, String quarter, String lastname,
                                            TontineMemberDeliveryStatus status, double total, double available) {
        Client client = new Client();
        client.setLastname(lastname);
        client.setFirstname("Ama");
        client.setQuarter(quarter);
        client.setPhone("90000000");
        TontineMember member = new TontineMember();
        member.setClient(client);
        member.setDeliveryStatus(status);
        member.setAvailableContribution(available);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setTontineMember(member);
        delivery.setCommercialUsername(commercial);
        delivery.setReference("LIV-" + lastname);
        delivery.setPlannedDeliveryDate(DATE);
        delivery.setTotalAmount(total);
        TontineDeliveryItem item = new TontineDeliveryItem();
        item.setArticleName("Riz 25 kg");
        item.setQuantity(2);
        item.setTotalPrice(total);
        delivery.setItems(new ArrayList<>(List.of(item)));
        return delivery;
    }
}
