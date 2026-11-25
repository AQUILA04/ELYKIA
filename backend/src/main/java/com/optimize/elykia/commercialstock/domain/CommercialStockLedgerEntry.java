package com.optimize.elykia.commercialstock.domain;

import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.CommercialStockReferenceType;
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

/** Ligne immuable (append-only) du ledger de stock commercial. */
@Entity
@Table(name = "commercial_stock_ledger_entry")
@Getter
@Setter
public class CommercialStockLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;

    @Column(name = "position_id", nullable = false, updatable = false)
    private Long positionId;

    /** @deprecated Utiliser {@link #commercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    @Column(name = "collector", nullable = false, updatable = false, length = 100)
    private String collector;

    @Column(name = "commercial_username", nullable = false, updatable = false, length = 100)
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

    @Column(name = "article_id", nullable = false, updatable = false)
    private Long articleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false, updatable = false, length = 20)
    private StockActivityType activityType;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, updatable = false, length = 30)
    private CommercialStockMovementType movementType;

    /** Signé : + entrée, − sortie, 0 pour une réévaluation de prix. */
    @Column(name = "delta_quantity", nullable = false, updatable = false)
    private Integer deltaQuantity;

    @Column(name = "quantity_before", nullable = false, updatable = false)
    private Integer quantityBefore;

    @Column(name = "quantity_after", nullable = false, updatable = false)
    private Integer quantityAfter;

    @Column(name = "unit_purchase_cost", updatable = false)
    private Double unitPurchaseCost;

    @Column(name = "unit_sale_price", updatable = false)
    private Double unitSalePrice;

    @Column(name = "previous_sale_price", updatable = false)
    private Double previousSalePrice;

    @Column(name = "total_sale_value", updatable = false)
    private Double totalSaleValue;

    @Column(name = "total_purchase_value", updatable = false)
    private Double totalPurchaseValue;

    @Column(name = "margin_amount", updatable = false)
    private Double marginAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", updatable = false, length = 30)
    private CommercialStockReferenceType referenceType;

    @Column(name = "reference_id", updatable = false)
    private Long referenceId;

    @Column(name = "reference_code", updatable = false, length = 100)
    private String referenceCode;

    @Column(name = "tontine_session_id", updatable = false)
    private Long tontineSessionId;

    /** Lie les deux mouvements d'un transfert interne entre activités. */
    @Column(name = "transfer_id", updatable = false, length = 40)
    private String transferId;

    /** Mouvement annulé/extourné par cette ligne (restauration exacte) ; unique pour empêcher une double restauration. */
    @Column(name = "reverses_movement_id", updatable = false)
    private Long reversesMovementId;

    /** Date comptable de rattachement à une période (peut précéder la date de saisie réelle). */
    @Column(name = "accounting_date", nullable = false, updatable = false)
    private LocalDate accountingDate;

    /** Horodatage de saisie réelle (GMT). */
    @Column(name = "occurred_at", nullable = false, updatable = false)
    private LocalDateTime occurredAt;

    @Column(name = "backdated", nullable = false, updatable = false)
    private boolean backdated;

    @Column(name = "backdated_reason", updatable = false, length = 255)
    private String backdatedReason;

    @Column(name = "performed_by", updatable = false, length = 100)
    private String performedBy;
}
