package com.optimize.elykia.commercialstock.domain;

import com.optimize.elykia.commercialstock.api.StockActivityType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Arrêté périodique (jalon de lecture rapide) ; le ledger reste la source de vérité. */
@Entity
@Table(name = "commercial_stock_period_snapshot")
@Getter
@Setter
public class CommercialStockPeriodSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** @deprecated Utiliser {@link #commercialUsername}. */
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

    @Enumerated(EnumType.STRING)
    @Column(name = "period_grain", nullable = false, length = 20)
    private SnapshotPeriodGrain periodGrain;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "period_month")
    private Integer periodMonth;

    @Column(name = "tontine_session_id")
    private Long tontineSessionId;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "opening_quantity", nullable = false)
    private Integer openingQuantity;

    @Column(name = "in_quantity", nullable = false)
    private Integer inQuantity;

    @Column(name = "sold_quantity", nullable = false)
    private Integer soldQuantity;

    @Column(name = "returned_quantity", nullable = false)
    private Integer returnedQuantity;

    @Column(name = "transfer_net_quantity", nullable = false)
    private Integer transferNetQuantity;

    @Column(name = "debt_quantity", nullable = false)
    private Integer debtQuantity;

    @Column(name = "adjustment_net_quantity", nullable = false)
    private Integer adjustmentNetQuantity;

    @Column(name = "closing_quantity", nullable = false)
    private Integer closingQuantity;

    @Column(name = "opening_purchase_value")
    private Double openingPurchaseValue;

    @Column(name = "closing_purchase_value")
    private Double closingPurchaseValue;

    @Column(name = "closing_sale_value")
    private Double closingSaleValue;

    @Column(name = "sold_value")
    private Double soldValue;

    @Column(name = "purchase_cost_of_sold")
    private Double purchaseCostOfSold;

    @Column(name = "realized_margin")
    private Double realizedMargin;

    @Column(name = "closed_at", nullable = false)
    private LocalDateTime closedAt;

    /** Renseigné quand une régularisation antidatée a recalculé ce snapshot. */
    @Column(name = "restated_at")
    private LocalDateTime restatedAt;
}
