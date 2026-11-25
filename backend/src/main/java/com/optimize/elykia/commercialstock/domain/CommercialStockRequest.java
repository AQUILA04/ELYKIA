package com.optimize.elykia.commercialstock.domain;

import com.optimize.elykia.commercialstock.api.CommercialStockRequestStatus;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/**
 * Demande de sortie de stock commercial unifiée (CREDIT et TONTINE) par agence.
 * Remplace {@code StockRequest} et {@code StockTontineRequest}.
 */
@Entity
@Table(name = "commercial_stock_request")
@Getter
@Setter
@NoArgsConstructor
public class CommercialStockRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference", nullable = false, unique = true, length = 100)
    private String reference;

    @Column(name = "agency_id", nullable = false)
    private Long agencyId;

    @Column(name = "commercial_username", nullable = false, length = 100)
    private String commercialUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false, length = 20)
    private StockActivityType activityType;

    @Column(name = "tontine_session_id")
    private Long tontineSessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private CommercialStockRequestStatus status = CommercialStockRequestStatus.CREATED;

    @Column(name = "request_date", nullable = false)
    private LocalDate requestDate;

    @Column(name = "validation_date")
    private LocalDate validationDate;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Column(name = "accounting_date")
    private LocalDate accountingDate;

    @Column(name = "total_sale_price", nullable = false)
    private Double totalSalePrice = 0.0;

    @Column(name = "total_purchase_price", nullable = false)
    private Double totalPurchasePrice = 0.0;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "parent_request_id")
    private Long parentRequestId;

    @Column(name = "legacy_credit_request_id", unique = true)
    private Long legacyCreditRequestId;

    @Column(name = "legacy_tontine_request_id", unique = true)
    private Long legacyTontineRequestId;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CommercialStockRequestItem> items = new ArrayList<>();

    public void addItem(CommercialStockRequestItem item) {
        items.add(item);
        item.setRequest(this);
    }

    public void removeItem(CommercialStockRequestItem item) {
        items.remove(item);
        item.setRequest(null);
    }

    public void recalculateTotals() {
        double sale = 0.0;
        double purchase = 0.0;
        for (CommercialStockRequestItem item : items) {
            int qty = item.getQuantityDelivered() != null && item.getQuantityDelivered() > 0
                    ? item.getQuantityDelivered()
                    : (item.getQuantityRequested() != null ? item.getQuantityRequested() : 0);
            sale += qty * (item.getUnitSalePrice() != null ? item.getUnitSalePrice() : 0.0);
            purchase += qty * (item.getUnitPurchaseCost() != null ? item.getUnitPurchaseCost() : 0.0);
        }
        this.totalSalePrice = sale;
        this.totalPurchasePrice = purchase;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (requestDate == null) {
            requestDate = now.toLocalDate();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
