package com.optimize.elykia.tontine.application;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.tontine.domain.TontineDelivery;
import com.optimize.elykia.sale.application.TontineSaleService;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.SaleLinePricing;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Orchestrates creation of a settled {@link Credit} from a {@link TontineDelivery}, keeping the
 * dependency strictly unidirectional ({@code tontine -> sale}).
 */
@Service
@RequiredArgsConstructor
public class TontineCreditCreationService {

    private final TontineSaleService tontineSaleService;
    private final TontineStockService tontineStockService;

    @Transactional
    public void createTontineCredit(TontineDelivery delivery) {
        Credit credit = buildFromDelivery(delivery);
        tontineSaleService.createTontineSale(
                credit,
                String.valueOf(delivery.getTontineMember().getClient().getId()),
                () -> tontineStockService.validateTontineStockAvailability(credit.getArticles(), credit.getCollector()),
                savedCredit -> tontineStockService.deductTontineStockForDelivery(
                        savedCredit.getArticles(),
                        savedCredit.getCollector(),
                        savedCredit.getId(),
                        savedCredit.getReference(),
                        delivery));
    }

    public static Credit buildFromDelivery(TontineDelivery delivery) {
        double totalPurchase = delivery.getItems().stream()
                .mapToDouble(item -> {
                    if (item.getSaleLine() != null && item.getSaleLine().getLinePurchaseAmount() != null
                            && item.getSaleLine().getLinePurchaseAmount() > 0) {
                        return item.getSaleLine().getLinePurchaseAmount();
                    }
                    return item.getQuantity() * item.getArticles().getPurchasePrice();
                })
                .sum();

        Set<CreditArticles> creditArticles = delivery.getItems().stream()
                .map(tontineDeliveryItem -> {
                    CreditArticles ca = new CreditArticles();
                    ca.setArticles(tontineDeliveryItem.getArticles());
                    ca.setQuantity(tontineDeliveryItem.getQuantity());
                    ca.setUnitPrice(tontineDeliveryItem.getUnitPrice());
                    if (tontineDeliveryItem.getSaleLine() != null) {
                        SaleLinePricing source = tontineDeliveryItem.getSaleLine();
                        SaleLinePricing copy = new SaleLinePricing();
                        copy.setSalePackMode(source.getSalePackMode());
                        copy.setPackLabel(source.getPackLabel());
                        copy.setPackCount(source.getPackCount());
                        copy.setUnitsPerPack(source.getUnitsPerPack());
                        copy.setPackPrice(source.getPackPrice());
                        copy.setLineAmount(source.getLineAmount());
                        copy.setLinePurchaseAmount(source.getLinePurchaseAmount());
                        copy.setLineMargin(source.getLineMargin());
                        ca.setSaleLine(copy);
                    }
                    return ca;
                })
                .collect(Collectors.toSet());

        Client client = delivery.getTontineMember().getClient();
        return Credit.newTontineSale(
                client,
                client.getCollector(),
                delivery.getTotalAmount(),
                totalPurchase,
                creditArticles,
                LocalDate.now());
    }
}
