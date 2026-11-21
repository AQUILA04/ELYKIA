package com.optimize.elykia.core.service.tontine;

import com.optimize.common.securities.repository.UserRepository;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.service.report.PdfDocumentIdentity;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;

/** Rendu réel du reçu de commande tontine : soldes, reste à payer, reliquat. */
@ExtendWith(MockitoExtension.class)
class TontineOrderReceiptRenderingTest {

    @Mock
    private UserRepository userRepository;
    @InjectMocks
    private TontineOrderReceiptPdfService service;

    private TemplateEngine engine;
    private TontineMember member;
    private TontineDelivery delivery;

    @BeforeEach
    void setUp() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        engine = new org.thymeleaf.spring6.SpringTemplateEngine();
        engine.setTemplateResolver(resolver);

        lenient().when(userRepository.findByUserAccount_usernameIgnoreCase(anyString())).thenReturn(Optional.empty());

        Client client = new Client();
        client.setFirstname("Ama");
        client.setLastname("KOFFI");
        member = new TontineMember();
        member.setClient(client);
        delivery = new TontineDelivery();
        delivery.setId(1L);
        delivery.setReference("LIV-2026-11-A1B2C3D4");
        delivery.setAuthenticityCode("ELY-A1B2-C3D4");
        delivery.setTontineMember(member);
        delivery.setRequestDate(LocalDateTime.of(2026, 11, 20, 9, 30));
        delivery.setCommercialUsername("COM005");
        delivery.setItems(new ArrayList<>());
    }

    @Test
    void orderAboveTheBalanceShowsTheAmountToPay() {
        member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        member.setAvailableContribution(40_000.0);
        delivery.setTotalAmount(55_000.0);

        String html = render();

        assertTrue(html.contains("Solde net cotisé"), html);
        assertTrue(html.contains("Montant de la commande"));
        assertTrue(html.contains("Reste à payer"));
        assertTrue(html.contains("15 000 FCFA"));
        assertFalse(html.contains("Reliquat à restituer"));
    }

    @Test
    void orderBelowTheBalanceShowsTheBalanceToRefund() {
        member.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
        member.setAvailableContribution(60_000.0);
        delivery.setTotalAmount(45_500.0);

        String html = render();

        assertTrue(html.contains("Reliquat à restituer"));
        assertTrue(html.contains("14 500 FCFA"));
        assertFalse(html.contains("Reste à payer"));
    }

    @Test
    void deliveredOrderShowsContributedUsedAndRemainingTotals() {
        member.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        delivery.setTotalAmount(50_000.0);
        delivery.setRemainingBalance(0.0);

        String html = render();

        assertTrue(html.contains("Total cotisé (net)"));
        assertTrue(html.contains("Total utilisé"));
        assertTrue(html.contains("Total restant"));
        assertFalse(html.contains("Reste à payer"));
    }

    @Test
    void orderShowsThePlannedDeliveryDate() {
        member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        member.setAvailableContribution(40_000.0);
        delivery.setTotalAmount(30_000.0);
        delivery.setPlannedDeliveryDate(java.time.LocalDate.of(2026, 12, 15));

        String html = render();

        assertTrue(html.contains("Livraison prévue le 15/12/2026"));
    }

    @Test
    void orderWithoutPlannedDateKeepsTheDefaultLabel() {
        member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        member.setAvailableContribution(40_000.0);
        delivery.setTotalAmount(30_000.0);

        String html = render();

        assertFalse(html.contains("Livraison prévue le"));
        assertTrue(html.contains("Commande tontine"));
    }

    @Test
    void receiptStillRendersAsPdf() {
        member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        member.setAvailableContribution(40_000.0);
        delivery.setTotalAmount(55_000.0);

        byte[] pdf = new PdfHtmlRenderer().htmlToPdf(render(), PdfDocumentIdentity.footerLabel("Reçu de commande tontine"));

        assertTrue(pdf.length > 1000);
        assertEquals("%PDF", new String(pdf, 0, 4));
    }

    private String render() {
        Context context = new Context();
        PdfDocumentIdentity.applyTo(context, "Reçu de commande tontine");
        context.setVariable("doc", service.toDto(delivery));
        // Locale.FRANCE sépare les milliers par une espace insécable (fine) : on la ramène à une espace.
        return engine.process("tontine-order-receipt", context).replace(' ', ' ').replace(' ', ' ');
    }
}
