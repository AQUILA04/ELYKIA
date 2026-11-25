package com.optimize.elykia.commercialstock.domain;

import com.optimize.elykia.commercialstock.api.CommercialStockReturnStatus;
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
 * Retour de stock commercial unifié (CREDIT et TONTINE) par agence.
 * Remplace {@code StockReturn} et {@code StockTontineReturn}.
 */
@Entity
@Table(name = "commercial_stock_return")
@Getter
@Setter
@NoArgsConstructor
public class CommercialStockReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference", unique = true, length = 100)
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
    private CommercialStockReturnStatus status = CommercialStockReturnStatus.CREATED;

    @Column(name = "return_date", nullable = false)
    private LocalDate returnDate;

    @Column(name = "received_date")
    private LocalDate receivedDate;

    @Column(name = "received_by", length = 100)
    private String receivedBy;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "legacy_credit_return_id", unique = true)
    private Long legacyCreditReturnId;

    @Column(name = "legacy_tontine_return_id", unique = true)
    private Long legacyTontineReturnId;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "stockReturn", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CommercialStockReturnItem> items = new ArrayList<>();

    public void addItem(CommercialStockReturnItem item) {
        items.add(item);
        item.setStockReturn(this);
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (returnDate == null) {
            returnDate = now.toLocalDate();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
