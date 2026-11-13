package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.dto.sale.SaleLineQuote;
import com.optimize.elykia.core.dto.sale.SaleOfferDto;
import com.optimize.elykia.core.dto.stock.FifoLotSlice;
import com.optimize.elykia.core.entity.article.ArticleSalePack;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.entity.stock.ArticleStockLotSalePack;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.entity.tontine.TontineStockLayer;
import com.optimize.elykia.core.entity.tontine.TontineStockLayerSalePack;
import com.optimize.elykia.core.enumaration.ArticleStockLotStatus;
import com.optimize.elykia.core.enumaration.SalePackMode;
import com.optimize.elykia.core.repository.ArticleStockLotRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.TontineStockLayerRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.stock.StockValuationFacade;
import com.optimize.elykia.core.util.ArticlePackagingRules;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Prix encaissé (fiche ou lot) et coût d'achat réel des unités sorties.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CashSalePricingService {

    public static final String PRICE_SOURCE_KEY = "CASH_SALE_PRICE_SOURCE";
    public static final String SOURCE_CATALOG = "CATALOG";
    public static final String SOURCE_FIFO_LOT = "FIFO_LOT";

    private static final int MONEY_SCALE = 2;

    private final ParameterService parameterService;
    private final StockValuationFacade stockValuationFacade;
    private final ArticlesRepository articlesRepository;
    private final ArticleStockLotRepository lotRepository;
    private final TontineStockRepository tontineStockRepository;
    private final TontineStockLayerRepository layerRepository;

    public boolean usesLotSalePrice() {
        if (!stockValuationFacade.isFifoEnabled()) {
            return false;
        }
        String value = parameterService.getValue(PRICE_SOURCE_KEY);
        return value != null && SOURCE_FIFO_LOT.equalsIgnoreCase(value.trim());
    }

    public List<SaleOfferDto> offers(Long articleId, String channel, String commercial) {
        Articles article = articlesRepository.findById(articleId)
                .orElseThrow(() -> new CustomValidationException("Article introuvable."));
        boolean tontine = channel != null && channel.equalsIgnoreCase("TONTINE");
        List<Slice> stock = tontine
                ? tontineSlices(article, commercial)
                : warehouseSlices(article);
        int available = stock.stream().mapToInt(slice -> slice.quantity).sum();
        if (!tontine && article.getStockQuantity() != null) {
            available = Math.max(available, article.getStockQuantity());
        }
        if (tontine && available <= 0) {
            available = Integer.MAX_VALUE / 4;
        }
        List<SaleOfferDto> offers = new ArrayList<>();
        addOffer(offers, article, stock, SalePackMode.UNIT, 1, "Unité", available);
        Integer units = article.getUnitsPerPackage();
        if (ArticlePackagingRules.hasPackaging(article) && units != null) {
            addOffer(offers, article, stock, SalePackMode.WHOLESALE, units, "Gros", available);
        }
        Integer half = ArticlePackagingRules.halfUnits(article);
        if (half != null) {
            addOffer(offers, article, stock, SalePackMode.HALF_WHOLESALE, half, "Demi-gros", available);
        }
        if (article.getSalePacks() != null) {
            article.getSalePacks().stream()
                    .sorted(Comparator.comparing(ArticleSalePack::getQuantity))
                    .forEach(pack -> addOffer(
                            offers,
                            article,
                            stock,
                            SalePackMode.CUSTOM,
                            pack.getQuantity(),
                            "Pack " + pack.getQuantity(),
                            available));
        }
        return offers;
    }

    public SaleLineQuote quoteWarehouse(
            Articles article,
            SalePackMode mode,
            Integer packCount,
            Integer unitsPerPack,
            Integer unitQuantity) {
        SalePackMode resolved = mode == null ? SalePackMode.UNIT : mode;
        int perPack = unitsPerPack(article, resolved, unitsPerPack);
        int count = resolved == SalePackMode.UNIT
                ? requireCount(unitQuantity, "La quantité")
                : requireCount(packCount, "Le nombre de packs");
        int unitQty = resolved == SalePackMode.UNIT ? count : count * perPack;
        if (article.getStockQuantity() == null || article.getStockQuantity() < unitQty) {
            throw new CustomValidationException(
                    "Stock magasin insuffisant pour " + article.getCommercialName() + ".");
        }
        List<Slice> slices = take(warehouseSlices(article), unitQty, article);
        return price(article, resolved, perPack, count, unitQty, slices);
    }

    public SaleLineQuote quoteTontine(
            Articles article,
            String commercial,
            SalePackMode mode,
            Integer packCount,
            Integer unitsPerPack,
            Integer unitQuantity) {
        SalePackMode resolved = mode == null ? SalePackMode.UNIT : mode;
        int perPack = unitsPerPack(article, resolved, unitsPerPack);
        int count = resolved == SalePackMode.UNIT
                ? requireCount(unitQuantity, "La quantité")
                : requireCount(packCount, "Le nombre de packs");
        int unitQty = resolved == SalePackMode.UNIT ? count : count * perPack;
        List<Slice> available = new ArrayList<>(tontineSlices(article, commercial));
        int stock = available.stream().mapToInt(slice -> slice.quantity).sum();
        if (stock < unitQty) {
            available.add(catalogSlice(article, unitQty - stock));
        }
        return price(article, resolved, perPack, count, unitQty, take(available, unitQty, article));
    }

    private void addOffer(
            List<SaleOfferDto> offers,
            Articles article,
            List<Slice> stock,
            SalePackMode mode,
            int unitsPerPack,
            String label,
            int availableUnits) {
        if (unitsPerPack < 1 || availableUnits < unitsPerPack) {
            return;
        }
        Double price = resolveDisplayedPrice(article, stock, mode, unitsPerPack);
        if (price == null || price <= 0) {
            return;
        }
        int prefix = usesLotSalePrice()
                ? samePricePrefix(article, stock, mode, unitsPerPack, price)
                : availableUnits;
        int maxPacks = prefix / unitsPerPack;
        if (maxPacks < 1) {
            return;
        }
        offers.add(SaleOfferDto.builder()
                .mode(mode)
                .label(label)
                .unitsPerPack(unitsPerPack)
                .salePrice(round(price))
                .maxPacks(maxPacks)
                .build());
    }

    private SaleLineQuote price(
            Articles article,
            SalePackMode mode,
            int perPack,
            int count,
            int unitQty,
            List<Slice> slices) {
        double salePrice = resolveChargedPrice(article, slices, mode, perPack);
        if (usesLotSalePrice() && !samePriceAcross(article, slices, mode, perPack, salePrice)) {
            throw new CustomValidationException(
                    "Le lot suivant n'a pas le même prix de vente. Ajoutez une autre ligne pour "
                            + article.getCommercialName() + ".");
        }
        double lineAmount = round(salePrice * count);
        double cost = purchaseCost(mode, count, perPack, slices);
        String label = label(mode, perPack);
        return SaleLineQuote.builder()
                .mode(mode)
                .label(label)
                .unitQuantity(unitQty)
                .packCount(mode == SalePackMode.UNIT ? null : count)
                .unitsPerPack(mode == SalePackMode.UNIT ? null : perPack)
                .packPrice(round(salePrice))
                .lineAmount(lineAmount)
                .linePurchaseAmount(round(cost))
                .lineMargin(round(lineAmount - cost))
                .build();
    }

    private double purchaseCost(SalePackMode mode, int count, int perPack, List<Slice> slices) {
        if (mode == SalePackMode.WHOLESALE && slices.size() == 1 && slices.get(0).wholesalePurchase != null
                && slices.get(0).quantity == count * perPack) {
            return slices.get(0).wholesalePurchase * count;
        }
        if (mode == SalePackMode.HALF_WHOLESALE && slices.size() == 1 && slices.get(0).halfPurchase != null
                && slices.get(0).quantity == count * perPack) {
            return slices.get(0).halfPurchase * count;
        }
        return slices.stream().mapToDouble(slice -> slice.quantity * slice.unitPurchase).sum();
    }

    private double resolveChargedPrice(Articles article, List<Slice> slices, SalePackMode mode, int perPack) {
        if (usesLotSalePrice() && !slices.isEmpty()) {
            Double lotPrice = priceOnSlice(slices.get(0), mode, perPack);
            if (lotPrice != null && lotPrice > 0) {
                return lotPrice;
            }
        }
        Double catalog = catalogPrice(article, mode, perPack);
        if (catalog == null || catalog <= 0) {
            throw new CustomValidationException("Prix de vente indisponible pour " + article.getCommercialName()
                    + " (" + label(mode, perPack) + ").");
        }
        return catalog;
    }

    private Double resolveDisplayedPrice(Articles article, List<Slice> stock, SalePackMode mode, int perPack) {
        if (usesLotSalePrice() && !stock.isEmpty()) {
            Double lotPrice = priceOnSlice(stock.get(0), mode, perPack);
            if (lotPrice != null && lotPrice > 0) {
                return lotPrice;
            }
        }
        return catalogPrice(article, mode, perPack);
    }

    private boolean samePriceAcross(
            Articles article, List<Slice> slices, SalePackMode mode, int perPack, double charged) {
        for (Slice slice : slices) {
            Double price = priceOnSlice(slice, mode, perPack);
            if (price == null || price <= 0) {
                price = catalogPrice(article, mode, perPack);
            }
            if (price == null || Math.abs(price - charged) > 0.009) {
                return false;
            }
        }
        return true;
    }

    private int samePricePrefix(
            Articles article, List<Slice> stock, SalePackMode mode, int perPack, double price) {
        int prefix = 0;
        for (Slice slice : stock) {
            Double slicePrice = priceOnSlice(slice, mode, perPack);
            if (slicePrice == null || slicePrice <= 0) {
                slicePrice = catalogPrice(article, mode, perPack);
            }
            if (slicePrice == null || Math.abs(slicePrice - price) > 0.009) {
                break;
            }
            prefix += slice.quantity;
        }
        return prefix;
    }

    private Double priceOnSlice(Slice slice, SalePackMode mode, int perPack) {
        return switch (mode) {
            case UNIT -> slice.unitSale;
            case WHOLESALE -> slice.wholesaleSale;
            case HALF_WHOLESALE -> slice.halfSale;
            case CUSTOM -> slice.packs.stream()
                    .filter(pack -> pack.getQuantity() == perPack)
                    .map(FifoLotSlice.PackPrice::getSalePrice)
                    .findFirst()
                    .orElse(null);
        };
    }

    private Double catalogPrice(Articles article, SalePackMode mode, int perPack) {
        return switch (mode) {
            case UNIT -> article.getSellingPrice();
            case WHOLESALE -> article.getWholesaleSalePrice();
            case HALF_WHOLESALE -> article.getHalfWholesaleSalePrice();
            case CUSTOM -> article.getSalePacks() == null ? null : article.getSalePacks().stream()
                    .filter(pack -> pack.getQuantity() != null && pack.getQuantity() == perPack)
                    .map(ArticleSalePack::getSalePrice)
                    .findFirst()
                    .orElse(null);
        };
    }

    private int unitsPerPack(Articles article, SalePackMode mode, Integer requested) {
        return switch (mode) {
            case UNIT -> 1;
            case WHOLESALE -> {
                if (!ArticlePackagingRules.hasPackaging(article)) {
                    throw new CustomValidationException("Cet article n'a pas de colis.");
                }
                yield article.getUnitsPerPackage();
            }
            case HALF_WHOLESALE -> {
                Integer half = ArticlePackagingRules.halfUnits(article);
                if (half == null) {
                    throw new CustomValidationException("Cet article n'a pas de demi-gros.");
                }
                yield half;
            }
            case CUSTOM -> {
                if (requested == null || requested < 2) {
                    throw new CustomValidationException("Un pack personnalisé contient au moins 2 unités.");
                }
                yield requested;
            }
        };
    }

    private List<Slice> warehouseSlices(Articles article) {
        if (!stockValuationFacade.isFifoEnabled()) {
            int qty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
            return qty > 0 ? List.of(catalogSlice(article, qty)) : List.of();
        }
        List<ArticleStockLot> lots = lotRepository.findOpenLotsForArticleOrderByFifo(
                article.getId(), ArticleStockLotStatus.OPEN);
        List<Slice> slices = new ArrayList<>();
        int lotted = 0;
        for (ArticleStockLot lot : lots) {
            slices.add(fromLot(lot));
            lotted += lot.getQuantityRemaining();
        }
        int stock = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
        if (stock > lotted) {
            slices.add(catalogSlice(article, stock - lotted));
        }
        return slices;
    }

    private List<Slice> tontineSlices(Articles article, String commercial) {
        if (!StringUtils.hasText(commercial)) {
            return List.of();
        }
        TontineStock stock = tontineStockRepository.getArticleForCommercial(article.getId(), commercial);
        if (stock == null || stock.getAvailableQuantity() == null || stock.getAvailableQuantity() <= 0) {
            return List.of();
        }
        List<TontineStockLayer> layers = layerRepository
                .findByTontineStockIdAndQuantityRemainingGreaterThanOrderByIdAsc(stock.getId(), 0);
        if (layers.isEmpty()) {
            return List.of(catalogSlice(article, stock.getAvailableQuantity()));
        }
        List<Slice> slices = new ArrayList<>();
        int layered = 0;
        for (TontineStockLayer layer : layers) {
            slices.add(fromLayer(layer));
            layered += layer.getQuantityRemaining();
        }
        if (stock.getAvailableQuantity() > layered) {
            slices.add(catalogSlice(article, stock.getAvailableQuantity() - layered));
        }
        return slices;
    }

    private List<Slice> take(List<Slice> available, int unitQty, Articles article) {
        List<Slice> taken = new ArrayList<>();
        int remaining = unitQty;
        for (Slice slice : available) {
            if (remaining <= 0) {
                break;
            }
            int use = Math.min(remaining, slice.quantity);
            taken.add(slice.withQuantity(use));
            remaining -= use;
        }
        if (remaining > 0) {
            throw new CustomValidationException(
                    "Stock insuffisant pour " + article.getCommercialName() + ".");
        }
        return taken;
    }

    private Slice fromLot(ArticleStockLot lot) {
        List<FifoLotSlice.PackPrice> packs = new ArrayList<>();
        if (lot.getSalePacks() != null) {
            for (ArticleStockLotSalePack pack : lot.getSalePacks()) {
                packs.add(new FifoLotSlice.PackPrice(pack.getQuantity(), pack.getSalePrice()));
            }
        }
        return new Slice(
                lot.getQuantityRemaining(),
                lot.getUnitPurchasePrice(),
                lot.getUnitSalePrice(),
                lot.getWholesalePurchasePrice(),
                lot.getWholesaleSalePrice(),
                lot.getHalfWholesalePurchasePrice(),
                lot.getHalfWholesaleSalePrice(),
                packs);
    }

    private Slice fromLayer(TontineStockLayer layer) {
        List<FifoLotSlice.PackPrice> packs = new ArrayList<>();
        if (layer.getSalePacks() != null) {
            for (TontineStockLayerSalePack pack : layer.getSalePacks()) {
                packs.add(new FifoLotSlice.PackPrice(pack.getQuantity(), pack.getSalePrice()));
            }
        }
        return new Slice(
                layer.getQuantityRemaining(),
                layer.getUnitPurchasePrice(),
                layer.getUnitSalePrice(),
                layer.getWholesalePurchasePrice(),
                layer.getWholesaleSalePrice(),
                layer.getHalfWholesalePurchasePrice(),
                layer.getHalfWholesaleSalePrice(),
                packs);
    }

    private Slice catalogSlice(Articles article, int quantity) {
        List<FifoLotSlice.PackPrice> packs = new ArrayList<>();
        if (article.getSalePacks() != null) {
            for (ArticleSalePack pack : article.getSalePacks()) {
                if (pack.getQuantity() != null && pack.getSalePrice() != null) {
                    packs.add(new FifoLotSlice.PackPrice(pack.getQuantity(), pack.getSalePrice()));
                }
            }
        }
        return new Slice(
                quantity,
                article.getPurchasePrice(),
                article.getSellingPrice(),
                article.getWholesalePurchasePrice(),
                article.getWholesaleSalePrice(),
                article.getHalfWholesalePurchasePrice(),
                article.getHalfWholesaleSalePrice(),
                packs);
    }

    private static int requireCount(Integer value, String label) {
        if (value == null || value < 1) {
            throw new CustomValidationException(label + " doit être au moins 1.");
        }
        return value;
    }

    private static String label(SalePackMode mode, int perPack) {
        return switch (mode) {
            case UNIT -> "Unité";
            case WHOLESALE -> "Gros";
            case HALF_WHOLESALE -> "Demi-gros";
            case CUSTOM -> "Pack " + perPack;
        };
    }

    private static double round(double value) {
        return BigDecimal.valueOf(value).setScale(MONEY_SCALE, RoundingMode.HALF_UP).doubleValue();
    }

    private record Slice(
            int quantity,
            double unitPurchase,
            Double unitSale,
            Double wholesalePurchase,
            Double wholesaleSale,
            Double halfPurchase,
            Double halfSale,
            List<FifoLotSlice.PackPrice> packs) {

        Slice withQuantity(int quantity) {
            return new Slice(quantity, unitPurchase, unitSale, wholesalePurchase, wholesaleSale,
                    halfPurchase, halfSale, packs);
        }
    }
}
