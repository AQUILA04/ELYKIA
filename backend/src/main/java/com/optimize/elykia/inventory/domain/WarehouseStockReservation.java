package com.optimize.elykia.inventory.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "warehouse_stock_reservation")
@Getter
@Setter
@NoArgsConstructor
public class WarehouseStockReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agency_id", nullable = false)
    private Long agencyId;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reservation_type", nullable = false, length = 40)
    private WarehouseReservationType reservationType;

    @Column(name = "reference_id", nullable = false)
    private Long referenceId;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    @Column(name = "beneficiary", length = 100)
    private String beneficiary;

    @Column(name = "quantity_requested", nullable = false)
    private Integer quantityRequested;

    @Column(name = "quantity_reserved", nullable = false)
    private Integer quantityReserved = 0;

    @Column(name = "shortage_quantity", nullable = false)
    private Integer shortageQuantity = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private WarehouseReservationStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    public static WarehouseStockReservation create(
            Long agencyId,
            Long articleId,
            WarehouseReservationType type,
            Long referenceId,
            String referenceCode,
            String beneficiary,
            int quantityRequested,
            int quantityReserved,
            String performedBy) {
        WarehouseStockReservation res = new WarehouseStockReservation();
        res.agencyId = agencyId;
        res.articleId = articleId;
        res.reservationType = type;
        res.referenceId = referenceId;
        res.referenceCode = referenceCode;
        res.beneficiary = beneficiary;
        res.quantityRequested = quantityRequested;
        res.quantityReserved = quantityReserved;
        res.shortageQuantity = Math.max(0, quantityRequested - quantityReserved);
        res.status = computeStatus(quantityRequested, quantityReserved);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        res.createdAt = now;
        res.updatedAt = now;
        res.performedBy = performedBy;
        return res;
    }

    public static WarehouseReservationStatus computeStatus(int requested, int reserved) {
        if (reserved >= requested) {
            return WarehouseReservationStatus.ACTIVE;
        }
        if (reserved > 0) {
            return WarehouseReservationStatus.PARTIALLY_RESERVED;
        }
        return WarehouseReservationStatus.BACKORDERED;
    }

    public void allocateAdditional(int additionalReserved) {
        if (additionalReserved <= 0) {
            return;
        }
        this.quantityReserved = (this.quantityReserved == null ? 0 : this.quantityReserved) + additionalReserved;
        this.shortageQuantity = Math.max(0, this.quantityRequested - this.quantityReserved);
        this.status = computeStatus(this.quantityRequested, this.quantityReserved);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void markFulfilled() {
        this.status = WarehouseReservationStatus.FULFILLED;
        this.shortageQuantity = 0;
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        this.updatedAt = now;
        this.resolvedAt = now;
    }

    public void markReleased() {
        this.status = WarehouseReservationStatus.RELEASED;
        this.quantityReserved = 0;
        this.shortageQuantity = 0;
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        this.updatedAt = now;
        this.resolvedAt = now;
    }
}
