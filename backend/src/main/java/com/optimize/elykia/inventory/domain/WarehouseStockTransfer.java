package com.optimize.elykia.inventory.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

/**
 * Transfert de stock inter-agences piloté par le Chef Magasinier ({@code STOREKEEPER_MANAGER}).
 */
@Entity
@Table(name = "warehouse_stock_transfer")
@Getter
@Setter
@NoArgsConstructor
public class WarehouseStockTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference", nullable = false, unique = true, length = 100)
    private String reference;

    @Column(name = "source_agency_id", nullable = false)
    private Long sourceAgencyId;

    @Column(name = "target_agency_id", nullable = false)
    private Long targetAgencyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private WarehouseTransferStatus status = WarehouseTransferStatus.CREATED;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "validated_by", length = 100)
    private String validatedBy;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "shipped_by", length = 100)
    private String shippedBy;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "received_by", length = 100)
    private String receivedBy;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Column(name = "cancelled_by", length = 100)
    private String cancelledBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @OneToMany(mappedBy = "transfer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WarehouseStockTransferItem> items = new ArrayList<>();

    public void addItem(WarehouseStockTransferItem item) {
        items.add(item);
        item.setTransfer(this);
    }

    @PrePersist
    void ensureCreatedAt() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now(ZoneOffset.UTC);
        }
    }
}
