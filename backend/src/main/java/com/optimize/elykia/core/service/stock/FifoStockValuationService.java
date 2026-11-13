package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.dto.stock.FifoLotSlice;
import com.optimize.elykia.core.entity.article.ArticleSalePack;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.entity.stock.ArticleStockLotConsumption;
import com.optimize.elykia.core.entity.stock.ArticleStockLotSalePack;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.enumaration.ArticleStockLotStatus;
import com.optimize.elykia.core.enumaration.StockEntryPackagingMode;
import com.optimize.elykia.core.repository.ArticleStockLotConsumptionRepository;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.StockReceptionItemRepository;
import com.optimize.elykia.core.util.ArticlePackagingRules;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class FifoStockValuationService {

    private final ArticleStockLotRepository lotRepository;
    private final ArticleStockLotConsumptionRepository consumptionRepository;
    private final ArticlesRepository articlesRepository;
    private final StockReceptionItemRepository stockReceptionItemRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ArticleStockLot registerEntry(
            Articles article,
            int quantity,
            double unitPurchasePrice,
            ArticleStockLotSourceType sourceType,
            StockReceptionItem receptionItem,
            LocalDate entryDate) {
        if (quantity <= 0) {
            throw new CustomValidationException("La quantité d'entrée doit être strictement positive.");
        }
        if (unitPurchasePrice <= 0) {
            throw new CustomValidationException("Le prix d'achat unitaire doit être strictement positif.");
        }

        ArticleStockLot lot = new ArticleStockLot();
        lot.setArticle(article);
        lot.setQuantityInitial(quantity);
        lot.setQuantityRemaining(quantity);
        lot.setUnitPurchasePrice(unitPurchasePrice);
        lot.setEntryDate(entryDate != null ? entryDate : LocalDate.now());
        lot.setSourceType(sourceType);
        lot.setStatus(ArticleStockLotStatus.OPEN);
        if (receptionItem != null) {
            lot.setStockReceptionItem(receptionItem);
            if (receptionItem.getEntryPackagingMode() == StockEntryPackagingMode.WHOLESALE) {
                lot.setWholesalePurchasePrice(receptionItem.getPackagePrice());
            } else if (receptionItem.getEntryPackagingMode() == StockEntryPackagingMode.HALF_WHOLESALE) {
                lot.setHalfWholesalePurchasePrice(receptionItem.getPackagePrice());
            }
        }
        stampSalePrices(lot, article, receptionItem);

        return lotRepository.save(lot);
    }

    public void cancelEntry(StockReceptionItem receptionItem) {
        ArticleStockLot lot = lotRepository.findByStockReceptionItemId(receptionItem.getId())
                .orElse(null);

        if (lot != null) {
            if (lot.getQuantityRemaining() != lot.getQuantityInitial()) {
                throw new CustomValidationException(
                        "Impossible d'annuler cette réception car des articles (lot FIFO) ont déjà été consommés ou vendus.");
            }
            lotRepository.delete(lot);
        }
    }

    public FifoConsumptionResult consume(
            Articles article,
            int quantity,
            ArticleStockLotMovementType movementType,
            String sourceType,
            Long sourceId) {
        if (quantity <= 0) {
            throw new CustomValidationException("La quantité à consommer doit être strictement positive.");
        }

        Articles locked = articlesRepository.findByIdForUpdate(article.getId()).orElse(article);
        if (entityManager != null && entityManager.contains(locked)) {
            entityManager.flush();
            entityManager.refresh(locked);
        }
        if (locked != article && locked.getStockQuantity() != null) {
            article.setStockQuantity(locked.getStockQuantity());
        }

        topUpUnlottedStock(locked, quantity, ArticleStockLotSourceType.MIGRATION);
        return consumeFromOpenLots(locked, quantity, movementType, sourceType, sourceId);
    }

    /**
     * Aligne les lots sur {@code stockQuantity} après un ajustement déjà appliqué en mémoire
     * (inventaire). Ne recharge pas l'article : le stock cible est celui passé en argument.
     */
    public void alignLotsToArticleStock(Articles article) {
        int stockQty = stockQuantity(article);
        int lotQty = getRemainingLotQuantity(article.getId());
        if (stockQty > lotQty) {
            registerGap(article, stockQty - lotQty, ArticleStockLotSourceType.INVENTORY_ADJUSTMENT);
            return;
        }
        if (lotQty > stockQty) {
            consumeFromOpenLots(
                    article,
                    lotQty - stockQty,
                    ArticleStockLotMovementType.ADJUSTMENT,
                    "INVENTORY",
                    article.getId());
        }
    }

    /**
     * Prix du lot d'ouverture : prix d'achat catalogue, sinon dernier prix d'une réception validée.
     */
    public Double resolveOpeningUnitPrice(Articles article) {
        if (article.getPurchasePrice() > 0) {
            return article.getPurchasePrice();
        }
        List<StockReceptionItem> validatedItems =
                stockReceptionItemRepository
                        .findValidatedWithPositiveUnitPriceByArticleIdOrderByReceptionDateDesc(
                                article.getId());
        if (validatedItems.isEmpty()) {
            return null;
        }
        return validatedItems.get(0).getUnitPrice();
    }

    /**
     * Le lot d'ouverture ne couvre que le stock présent à l'activation. Une entrée ou un
     * ajustement qui a augmenté {@code stockQuantity} sans lot laisserait la livraison
     * échouer alors que le magasin a la quantité. On valorise cet écart au prix d'achat,
     * derrière les lots déjà ouverts, uniquement quand la sortie en a besoin.
     */
    private void topUpUnlottedStock(Articles article, int quantityToConsume, ArticleStockLotSourceType sourceType) {
        int stockQty = stockQuantity(article);
        int lotQty = getRemainingLotQuantity(article.getId());
        int gap = stockQty - lotQty;
        if (gap <= 0 || lotQty >= quantityToConsume) {
            return;
        }
        registerGap(article, gap, sourceType);
    }

    private void registerGap(Articles article, int gap, ArticleStockLotSourceType sourceType) {
        Double unitPrice = resolveOpeningUnitPrice(article);
        if (unitPrice == null) {
            throw new CustomValidationException(
                    "Impossible de valoriser "
                            + gap
                            + " unité(s) en stock sans lot FIFO pour l'article "
                            + article.getCommercialName()
                            + " : prix d'achat manquant.");
        }
        registerEntry(article, gap, unitPrice, sourceType, null, LocalDate.now());
    }

    private FifoConsumptionResult consumeFromOpenLots(
            Articles article,
            int quantity,
            ArticleStockLotMovementType movementType,
            String sourceType,
            Long sourceId) {
        List<ArticleStockLot> openLots = lotRepository.findOpenLotsForArticleOrderByFifo(
                article.getId(), ArticleStockLotStatus.OPEN);

        int remainingToConsume = quantity;
        double totalCost = 0.0;
        List<FifoLotSlice> slices = new ArrayList<>();

        for (ArticleStockLot lot : openLots) {
            if (remainingToConsume <= 0) {
                break;
            }

            int available = lot.getQuantityRemaining();
            if (available <= 0) {
                continue;
            }

            int consumedFromLot = Math.min(available, remainingToConsume);
            double lineCost = consumedFromLot * lot.getUnitPurchasePrice();
            totalCost += lineCost;

            lot.setQuantityRemaining(available - consumedFromLot);
            if (lot.getQuantityRemaining() == 0) {
                lot.setStatus(ArticleStockLotStatus.DEPLETED);
            }
            lotRepository.save(lot);

            ArticleStockLotConsumption consumption = new ArticleStockLotConsumption();
            consumption.setLot(lot);
            consumption.setQuantity(consumedFromLot);
            consumption.setUnitPurchasePrice(lot.getUnitPurchasePrice());
            consumption.setMovementType(movementType);
            consumption.setSourceType(sourceType);
            consumption.setSourceId(sourceId);
            consumptionRepository.save(consumption);

            slices.add(FifoLotSlice.builder()
                    .lotId(lot.getId())
                    .quantity(consumedFromLot)
                    .unitPurchasePrice(lot.getUnitPurchasePrice())
                    .unitSalePrice(lot.getUnitSalePrice())
                    .wholesalePurchasePrice(lot.getWholesalePurchasePrice())
                    .wholesaleSalePrice(lot.getWholesaleSalePrice())
                    .halfWholesalePurchasePrice(lot.getHalfWholesalePurchasePrice())
                    .halfWholesaleSalePrice(lot.getHalfWholesaleSalePrice())
                    .unitsPerPackage(lot.getUnitsPerPackage())
                    .unitsPerHalfPackage(lot.getUnitsPerHalfPackage())
                    .salePacks(copyLotPacks(lot))
                    .build());

            remainingToConsume -= consumedFromLot;
        }

        if (remainingToConsume > 0) {
            throw new CustomValidationException(
                    "Stock FIFO insuffisant pour l'article "
                            + article.getCommercialName()
                            + " (manque "
                            + remainingToConsume
                            + " unité(s)). Vérifiez la cohérence des lots ou activez le backfill FIFO.");
        }

        double averageUnitCost = quantity > 0 ? totalCost / quantity : 0.0;
        return FifoConsumptionResult.builder()
                .totalCost(totalCost)
                .averageUnitCost(averageUnitCost)
                .quantityConsumed(quantity)
                .slices(slices)
                .build();
    }

    private void stampSalePrices(ArticleStockLot lot, Articles article, StockReceptionItem receptionItem) {
        boolean frozen = receptionItem != null && receptionItem.getUnitSalePrice() != null;
        lot.setUnitSalePrice(frozen ? receptionItem.getUnitSalePrice() : article.getSellingPrice());
        lot.setPackagingType(article.getPackagingType());
        lot.setUnitsPerPackage(article.getUnitsPerPackage());
        lot.setUnitsPerHalfPackage(ArticlePackagingRules.halfUnits(article));
        lot.setWholesaleSalePrice(frozen ? receptionItem.getWholesaleSalePrice() : article.getWholesaleSalePrice());
        lot.setHalfWholesaleSalePrice(frozen
                ? receptionItem.getHalfWholesaleSalePrice()
                : article.getHalfWholesaleSalePrice());
        if (frozen && receptionItem.getSalePacks() != null && !receptionItem.getSalePacks().isEmpty()) {
            for (var pack : receptionItem.getSalePacks()) {
                if (pack.getQuantity() == null || pack.getSalePrice() == null) {
                    continue;
                }
                ArticleStockLotSalePack copy = new ArticleStockLotSalePack();
                copy.setLot(lot);
                copy.setQuantity(pack.getQuantity());
                copy.setSalePrice(pack.getSalePrice());
                lot.getSalePacks().add(copy);
            }
            return;
        }
        if (article.getSalePacks() == null) {
            return;
        }
        for (ArticleSalePack pack : article.getSalePacks()) {
            if (pack.getQuantity() == null || pack.getSalePrice() == null) {
                continue;
            }
            ArticleStockLotSalePack copy = new ArticleStockLotSalePack();
            copy.setLot(lot);
            copy.setQuantity(pack.getQuantity());
            copy.setSalePrice(pack.getSalePrice());
            lot.getSalePacks().add(copy);
        }
    }

    private List<FifoLotSlice.PackPrice> copyLotPacks(ArticleStockLot lot) {
        List<FifoLotSlice.PackPrice> packs = new ArrayList<>();
        if (lot.getSalePacks() == null) {
            return packs;
        }
        for (ArticleStockLotSalePack pack : lot.getSalePacks()) {
            packs.add(new FifoLotSlice.PackPrice(pack.getQuantity(), pack.getSalePrice()));
        }
        return packs;
    }

    @Transactional(readOnly = true)
    public double getStockValuation(Long articleId) {
        Double value = lotRepository.sumRemainingValuationByArticleId(articleId);
        return value != null ? value : 0.0;
    }

    @Transactional(readOnly = true)
    public double getEstimatedMargin(Long articleId, double salePrice) {
        return lotRepository.findOpenLotsForArticleOrderByFifo(articleId, ArticleStockLotStatus.OPEN).stream()
                .mapToDouble(lot -> lot.getQuantityRemaining() * (salePrice - lot.getUnitPurchasePrice()))
                .sum();
    }

    @Transactional(readOnly = true)
    public int getRemainingLotQuantity(Long articleId) {
        Integer qty = lotRepository.sumRemainingQuantityByArticleId(articleId);
        return qty != null ? qty : 0;
    }

    private static int stockQuantity(Articles article) {
        return article.getStockQuantity() != null ? article.getStockQuantity() : 0;
    }

    public void assertLotQuantityMatchesArticle(Articles article) {
        int lotQty = getRemainingLotQuantity(article.getId());
        int articleQty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
        if (lotQty != articleQty) {
            throw new CustomValidationException(
                    "Incohérence FIFO pour l'article "
                            + article.getCommercialName()
                            + " : stock article="
                            + articleQty
                            + ", lots="
                            + lotQty);
        }
    }
}
