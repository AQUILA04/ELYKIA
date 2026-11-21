package com.optimize.elykia.tontine.application;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.tontine.domain.TontineDelivery;
import com.optimize.elykia.sale.application.CreditService;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SaleLinePricing;
import com.optimize.elykia.sale.domain.SolvencyStatus;
import com.optimize.elykia.shared.domain.OperationType;
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

    private final CreditService creditService;
    private final TontineStockService tontineStockService;

    @Transactional
    public void createTontineCredit(TontineDelivery delivery) {
        Credit credit = buildFromDelivery(delivery);
        creditService.createTontineCredit(
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
        Credit credit = new Credit();
        credit.setType(OperationType.TONTINE);
        credit.setStatus(CreditStatus.SETTLED);
        credit.setTotalAmount(delivery.getTotalAmount());
        credit.setTotalAmountPaid(delivery.getTotalAmount());
        credit.setTotalAmountRemaining(0.0);
        double totalPurchase = delivery.getItems().stream()
                .mapToDouble(item -> {
                    if (item.getSaleLine() != null && item.getSaleLine().getLinePurchaseAmount() != null
                            && item.getSaleLine().getLinePurchaseAmount() > 0) {
                        return item.getSaleLine().getLinePurchaseAmount();
                    }
                    return item.getQuantity() * item.getArticles().getPurchasePrice();
                })
                .sum();
        credit.setTotalPurchase(totalPurchase);
        credit.setDailyStake(delivery.getTotalAmount());
        LocalDate today = LocalDate.now();
        credit.setBeginDate(today);
        credit.setExpectedEndDate(today);
        credit.setEffectiveEndDate(today);
        credit.setSolvencyNote(SolvencyStatus.TIME);
        credit.setRemainingDaysCount(0);
        credit.setDailyPaid(true);
        credit.setClientType(ClientType.CLIENT);
        credit.setUpdatable(false);
        credit.setClient(delivery.getTontineMember().getClient());
        credit.setCollector(delivery.getTontineMember().getClient().getCollector());

        final Credit finalCredit = credit;
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
                    ca.setCredit(finalCredit);
                    return ca;
                })
                .collect(Collectors.toSet());
        credit.setArticles(creditArticles);
        return credit;
    }
}
