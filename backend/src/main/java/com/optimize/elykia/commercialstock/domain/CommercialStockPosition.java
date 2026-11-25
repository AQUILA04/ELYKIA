package com.optimize.elykia.commercialstock.domain;

import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;
import com.optimize.elykia.commercialstock.api.CommercialStockLayerSourceType;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Agrégat racine : stock continu d'un commercial pour un article et une activité.
 * Invariant : {@code quantityOnHand == somme(layers.quantityRemaining) >= 0}.
 */
@Entity
@Table(name = "commercial_stock_position",
        uniqueConstraints = @UniqueConstraint(name = "uk_commercial_stock_position",
                columnNames = {"collector", "article_id", "activity_type"}))
@Getter
@Setter
public class CommercialStockPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;

    /** @deprecated Utiliser {@link #commercialUsername}. Conservé pour compatibilité jusqu'à l'itération N+1. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    @Column(name = "collector", nullable = false, length = 100)
    private String collector;

    @Column(name = "commercial_username", nullable = false, length = 100)
    private String commercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.collector = commercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCollector(String collector) {
        this.collector = collector;
        this.commercialUsername = collector;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : collector;
    }

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false, length = 20)
    private StockActivityType activityType;

    @Column(name = "quantity_on_hand", nullable = false)
    private Integer quantityOnHand = 0;

    @Column(name = "weighted_avg_purchase_cost")
    private Double weightedAvgPurchaseCost;

    @Column(name = "current_sale_unit_price")
    private Double currentSaleUnitPrice;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "position", cascade = CascadeType.ALL, orphanRemoval = false)
    @OrderBy("acquiredAt ASC, id ASC")
    private List<CommercialStockLayer> layers = new ArrayList<>();

    public static CommercialStockPosition open(String collector, Long articleId, StockActivityType activityType) {
        CommercialStockPosition position = new CommercialStockPosition();
        position.setCommercialUsername(collector);
        position.articleId = articleId;
        position.activityType = activityType;
        position.quantityOnHand = 0;
        LocalDateTime now = nowUtc();
        position.createdAt = now;
        position.updatedAt = now;
        return position;
    }

    /** Ajoute une couche FIFO (entrée magasin, transfert entrant, restauration…). */
    public CommercialStockLayer receive(int quantity, double unitPurchaseCost, Double salePrice,
                                        CommercialStockLayerSourceType sourceType, Long sourceId,
                                        LocalDateTime acquiredAt) {
        return receive(quantity, unitPurchaseCost, salePrice, sourceType, sourceId, null, null, acquiredAt);
    }

    /** Ajoute une couche FIFO avec traçabilité du lot magasin d'origine. */
    public CommercialStockLayer receive(int quantity, double unitPurchaseCost, Double salePrice,
                                        CommercialStockLayerSourceType sourceType, Long sourceId,
                                        Long originWarehouseLotId, Long originReceptionItemId,
                                        LocalDateTime acquiredAt) {
        requirePositive(quantity);
        if (unitPurchaseCost < 0) {
            throw new IllegalArgumentException("Le coût d'achat ne peut pas être négatif.");
        }
        CommercialStockLayer layer = new CommercialStockLayer();
        layer.setPosition(this);
        layer.setQuantityInitial(quantity);
        layer.setQuantityRemaining(quantity);
        layer.setUnitPurchaseCost(unitPurchaseCost);
        layer.setInitialSalePrice(salePrice);
        layer.setEffectiveSalePrice(salePrice);
        layer.setSourceType(sourceType);
        layer.setSourceId(sourceId);
        layer.setOriginWarehouseLotId(originWarehouseLotId);
        layer.setOriginReceptionItemId(originReceptionItemId);
        layer.setAcquiredAt(acquiredAt != null ? acquiredAt : nowUtc());
        layers.add(layer);
        refreshCache();
        return layer;
    }

    /**
     * Consomme {@code quantity} unités en FIFO ({@code acquiredAt, id}) et renvoie le détail par couche.
     *
     * @param catalogPrice prix catalogue courant, requis pour {@link CommercialSalePriceSource#CURRENT_CATALOG}
     */
    public ConsumptionPlan consume(int quantity, CommercialSalePriceSource priceSource, Double catalogPrice) {
        requirePositive(quantity);
        if (quantity > quantityOnHand) {
            throw new InsufficientCommercialStockException(collector, articleId, activityType, quantityOnHand, quantity);
        }
        int toConsume = quantity;
        List<ConsumptionLine> lines = new ArrayList<>();
        List<CommercialStockLayer> ordered = layers.stream()
                .filter(CommercialStockLayer::isOpen)
                .sorted(Comparator.comparing(CommercialStockLayer::getAcquiredAt)
                        .thenComparing(CommercialStockLayer::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        for (CommercialStockLayer layer : ordered) {
            if (toConsume == 0) {
                break;
            }
            int taken = Math.min(toConsume, layer.getQuantityRemaining());
            layer.setQuantityRemaining(layer.getQuantityRemaining() - taken);
            lines.add(new ConsumptionLine(layer, taken, layer.getUnitPurchaseCost(),
                    SalePriceResolver.resolve(priceSource, layer, catalogPrice)));
            toConsume -= taken;
        }
        if (toConsume > 0) {
            throw new IllegalStateException("Invariant violé : somme des couches < quantité en main pour la position " + id);
        }
        refreshCache();
        return new ConsumptionPlan(lines);
    }

    /** Restitue {@code quantity} sur une couche existante (annulation de vente, extourne de dette). */
    public void restoreToLayer(CommercialStockLayer layer, int quantity) {
        requirePositive(quantity);
        int restored = layer.getQuantityRemaining() + quantity;
        if (restored > layer.getQuantityInitial()) {
            throw new IllegalStateException("Restauration au-delà de la quantité initiale de la couche " + layer.getId());
        }
        layer.setQuantityRemaining(restored);
        refreshCache();
    }

    /**
     * Réaligne le prix de vente effectif des couches ouvertes ; le coût d'achat n'est jamais modifié.
     *
     * @return nombre d'unités réévaluées
     */
    public int revaluateSalePrice(double newSalePrice) {
        int revalued = 0;
        for (CommercialStockLayer layer : layers) {
            if (layer.isOpen()) {
                layer.setEffectiveSalePrice(newSalePrice);
                revalued += layer.getQuantityRemaining();
            }
        }
        currentSaleUnitPrice = newSalePrice;
        updatedAt = nowUtc();
        return revalued;
    }

    /** Recalcule les caches de lecture (quantité en main, coût moyen pondéré). */
    public void refreshCache() {
        int quantity = 0;
        double purchaseValue = 0;
        Double lastPrice = currentSaleUnitPrice;
        for (CommercialStockLayer layer : layers) {
            if (layer.isOpen()) {
                quantity += layer.getQuantityRemaining();
                purchaseValue += layer.getQuantityRemaining() * layer.getUnitPurchaseCost();
                if (layer.getEffectiveSalePrice() != null) {
                    lastPrice = layer.getEffectiveSalePrice();
                }
            }
        }
        quantityOnHand = quantity;
        weightedAvgPurchaseCost = quantity == 0 ? null : purchaseValue / quantity;
        currentSaleUnitPrice = lastPrice;
        updatedAt = nowUtc();
    }

    private static void requirePositive(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("La quantité doit être strictement positive.");
        }
    }

    static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
