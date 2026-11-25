package com.optimize.elykia.inventory.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Grand livre immuable (append-only) des mouvements du stock magasin par agence.
 * Remplace {@link StockMovement} et {@link ArticleHistory}.
 */
@Entity
@Table(name = "warehouse_stock_ledger_entry")
@Getter
@Setter
@NoArgsConstructor
public class WarehouseStockLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agency_id", nullable = false)
    private Long agencyId;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "movement_type", nullable = false, length = 40)
    private String movementType;

    @Column(name = "quantity_delta", nullable = false)
    private Integer quantityDelta;

    @Column(name = "on_hand_before", nullable = false)
    private Integer onHandBefore;

    @Column(name = "on_hand_after", nullable = false)
    private Integer onHandAfter;

    @Column(name = "reserved_before", nullable = false)
    private Integer reservedBefore = 0;

    @Column(name = "reserved_after", nullable = false)
    private Integer reservedAfter = 0;

    @Column(name = "unit_cost")
    private Double unitCost;

    @Column(name = "total_cost")
    private Double totalCost;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    @Column(name = "beneficiary", length = 255)
    private String beneficiary;

    @Column(name = "reason", length = 1000)
    private String reason;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @Column(name = "operation_date", nullable = false)
    private LocalDate operationDate;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @PrePersist
    void ensureTimestamps() {
        if (occurredAt == null) {
            occurredAt = LocalDateTime.now(ZoneOffset.UTC);
        }
        if (operationDate == null) {
            operationDate = occurredAt.toLocalDate();
        }
    }
}
