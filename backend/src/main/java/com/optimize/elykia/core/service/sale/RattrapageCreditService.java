package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.sale.RattrapageCreditDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.service.stock.CommercialStockMovementService;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RattrapageCreditService {

    private final CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    private final CreditRepository creditRepository;
    private final ClientService clientService;
    private CommercialStockMovementService commercialStockMovementService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setCommercialStockMovementService(CommercialStockMovementService commercialStockMovementService) {
        this.commercialStockMovementService = commercialStockMovementService;
    }

    /**
     * Récupère les stocks résiduels (mois antérieurs) ayant au moins un article avec quantityRemaining > 0.
     */
    public List<CommercialMonthlyStock> getResidualStocks(String collector) {
        LocalDate now = LocalDate.now();
        log.info("[RattrapageCreditService] getResidualStocks collector={} currentMonth={} currentYear={}",
                collector, now.getMonthValue(), now.getYear());
        return commercialMonthlyStockRepository.findResidualStocksByCollector(
                collector, now.getMonthValue(), now.getYear());
    }

    /**
     * Crée un crédit de rattrapage à partir d'un stock résiduel antérieur.
     * Opération atomique — si une étape échoue, tout est annulé.
     */
    public Credit createRattrapage(RattrapageCreditDto dto) {
        log.info("[RattrapageCreditService] createRattrapage commercial={} clientId={} sourceStockId={}",
                dto.getCommercial(), dto.getClientId(), dto.getSourceStockId());

        // 1. Valider et récupérer le stock source
        CommercialMonthlyStock sourceStock = resolveSourceStock(dto);

        // 2. Récupérer le client
        Client client = resolveClient(dto.getClientId());

        // 3. Construire et valider les articles du crédit
        Set<CreditArticles> creditArticles = buildAndValidateArticles(dto, sourceStock);

        // 4. Construire le crédit
        Credit credit = buildCredit(dto, client, creditArticles);

        // 5. Persister le crédit
        creditRepository.save(credit);
        log.info("[RattrapageCreditService] Crédit RAT persisté id={} reference={}", credit.getId(), credit.getReference());

        // 6. Mettre à jour le stock source et enregistrer les mouvements
        updateSourceStock(dto, sourceStock, credit);

        return credit;
    }

    // ===== Méthodes privées =====

    private CommercialMonthlyStock resolveSourceStock(RattrapageCreditDto dto) {
        CommercialMonthlyStock sourceStock = commercialMonthlyStockRepository.findById(dto.getSourceStockId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stock source introuvable pour l'identifiant : " + dto.getSourceStockId()));

        // Vérifier que le stock appartient bien au commercial
        if (!dto.getCommercial().equals(sourceStock.getCollector())) {
            throw new CustomValidationException(
                    "Le stock sélectionné n'appartient pas au commercial : " + dto.getCommercial());
        }

        // Vérifier que le stock n'est pas le mois courant
        LocalDate now = LocalDate.now();
        boolean isCurrentMonth = sourceStock.getYear() == now.getYear()
                && sourceStock.getMonth() == now.getMonthValue();
        if (isCurrentMonth) {
            throw new CustomValidationException(
                    "Impossible d'effectuer un rattrapage sur le stock du mois courant.");
        }

        return sourceStock;
    }

    private Client resolveClient(Long clientId) {
        return clientService.getById(clientId);
    }



    private Set<CreditArticles> buildAndValidateArticles(RattrapageCreditDto dto, CommercialMonthlyStock sourceStock) {
        Set<CreditArticles> creditArticles = new HashSet<>();

        for (RattrapageCreditDto.RattrapageItemDto itemDto : dto.getItems()) {
            // Trouver le CommercialMonthlyStockItem correspondant dans le stock source
            CommercialMonthlyStockItem stockItem = sourceStock.getItems().stream()
                    .filter(i -> i.getId().equals(itemDto.getStockItemId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomValidationException(
                            "Article introuvable dans le stock source pour stockItemId=" + itemDto.getStockItemId()));

            // Vérifier que la quantité demandée ne dépasse pas quantityRemaining
            if (itemDto.getQuantity() > stockItem.getQuantityRemaining()) {
                String articleName = stockItem.getArticle() != null
                        ? stockItem.getArticle().getCommercialName()
                        : "Article id=" + itemDto.getArticleId();
                throw new CustomValidationException(String.format(
                        "Stock insuffisant pour l'article '%s' : disponible=%d, demandé=%d",
                        articleName, stockItem.getQuantityRemaining(), itemDto.getQuantity()));
            }

            // Construire le CreditArticles
            CreditArticles ca = new CreditArticles();
            ca.setArticles(stockItem.getArticle());
            ca.setQuantity(itemDto.getQuantity());
            ca.setUnitPrice(itemDto.getUnitPrice());
            ca.setStockItemId(stockItem.getId());
            creditArticles.add(ca);
        }

        return creditArticles;
    }

    private Credit buildCredit(RattrapageCreditDto dto, Client client, Set<CreditArticles> creditArticles) {
        Credit credit = new Credit();
        credit.setClient(client);
        credit.setClientType(ClientType.CLIENT);
        credit.setCollector(dto.getCommercial());
        credit.setType(OperationType.CREDIT);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setArticles(creditArticles);

        // Calculer le montant total
        double totalAmount = creditArticles.stream()
                .mapToDouble(ca -> ca.getUnitPrice() * ca.getQuantity())
                .sum();
        credit.setTotalAmount(totalAmount);

        // Avance
        double advance = dto.getAdvance() != null ? dto.getAdvance() : 0.0;
        credit.setAdvance(advance);
        credit.setTotalAmountPaid(advance);

        // Mise journalière
        credit.setDailyStake(dto.getDailyStake());

        // Date de début
        credit.setBeginDate(dto.getBeginDate());

        // Calcul du montant restant et de la date de fin (Propriété 4 : cas avance >= totalAmount)
        double amountRemaining = totalAmount - advance;
        if (amountRemaining <= 0) {
            credit.setTotalAmountRemaining(0.0);
            credit.setRemainingDaysCount(0);
            credit.setExpectedEndDate(dto.getBeginDate());
        } else {
            credit.setTotalAmountRemaining(amountRemaining);
            int days = (int) Math.ceil(amountRemaining / dto.getDailyStake());
            credit.setRemainingDaysCount(days);
            credit.setExpectedEndDate(dto.getBeginDate().plusDays(days));
        }

        // Référence unique de type RAT-XXXXXXXX
        credit.setReference(generateRattrapageReference());

        // Note optionnelle
        if (dto.getNote() != null && !dto.getNote().isBlank()) {
            // Le champ note n'existe pas sur Credit, on l'ignore
            // (pourra être ajouté dans une prochaine itération)
            credit.setOldReference(dto.getNote());
        }

        // Associer les articles au crédit
        credit.setCreditToCreditArticles();

        return credit;
    }

    private void updateSourceStock(RattrapageCreditDto dto, CommercialMonthlyStock sourceStock, Credit credit) {
        for (RattrapageCreditDto.RattrapageItemDto itemDto : dto.getItems()) {
            CommercialMonthlyStockItem stockItem = sourceStock.getItems().stream()
                    .filter(i -> i.getId().equals(itemDto.getStockItemId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomValidationException(
                            "Erreur lors de la mise à jour du stock : stockItemId=" + itemDto.getStockItemId()));

            Integer quantityBefore = stockItem.getQuantityRemaining();

            // Incrémenter quantitySold et recalculer quantityRemaining
            stockItem.setQuantitySold(stockItem.getQuantitySold() + itemDto.getQuantity());
            stockItem.updateRemaining();

            // Mettre à jour totalSoldValue
            double currentSoldValue = stockItem.getTotalSoldValue() != null ? stockItem.getTotalSoldValue() : 0.0;
            stockItem.setTotalSoldValue(currentSoldValue + (itemDto.getQuantity() * itemDto.getUnitPrice()));

            // Enregistrement du mouvement de stock CREDIT_SALE pour le rattrapage
            if (commercialStockMovementService != null) {
                commercialStockMovementService.record(
                        stockItem,
                        credit,
                        CommercialStockMovementType.CREDIT_SALE,
                        quantityBefore,
                        itemDto.getQuantity(),
                        stockItem.getQuantityRemaining()
                );
            }

            log.debug("[RattrapageCreditService] Stock mis à jour stockItemId={} quantitySold={} quantityRemaining={} totalSoldValue={}",
                    stockItem.getId(), stockItem.getQuantitySold(), stockItem.getQuantityRemaining(), stockItem.getTotalSoldValue());
        }

        // Persister le stock mis à jour (cascade ALL sur items)
        commercialMonthlyStockRepository.save(sourceStock);
    }

    /**
     * Génère une référence unique préfixée "RAT-" suivie de 8 caractères alphanumériques en majuscules.
     * Retry si la référence existe déjà en base.
     */
    private String generateRattrapageReference() {
        String ref;
        int attempts = 0;
        do {
            ref = "RAT-" + RandomStringUtils.randomAlphanumeric(8).toUpperCase();
            attempts++;
            if (attempts > 10) {
                throw new CustomValidationException("Impossible de générer une référence unique pour le rattrapage.");
            }
        } while (creditRepository.existsByReference(ref));
        return ref;
    }
}
