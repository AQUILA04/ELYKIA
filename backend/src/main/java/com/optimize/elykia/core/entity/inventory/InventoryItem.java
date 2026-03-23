package com.optimize.elykia.core.entity.inventory;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@Table(name = "inventory_item")
public class InventoryItem extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id", nullable = false)
    @ToString.Exclude
    private Inventory inventory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id", nullable = false)
    @ToString.Exclude
    private Articles article;

    @Column(name = "system_quantity", nullable = false)
    private Integer systemQuantity;

    @Column(name = "physical_quantity")
    private Integer physicalQuantity;

    @Column(name = "difference")
    private Integer difference;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InventoryItemStatus status = InventoryItemStatus.PENDING;

    @Column(name = "reconciliation_comment", length = 1000)
    private String reconciliationComment;

    @Column(name = "reconciled_by")
    private String reconciledBy;

    @Column(name = "reconciled_at")
    private LocalDateTime reconciledAt;

    @Column(name = "mark_as_debt", nullable = false)
    private Boolean markAsDebt = false;

    @Column(name = "debt_cancelled", nullable = false)
    private Boolean debtCancelled = false;

    @OneToMany(mappedBy = "inventoryItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @JsonIgnore
    private java.util.List<InventoryReconciliation> reconciliations = new java.util.ArrayList<>();

    public void calculateDifference() {
        if (physicalQuantity != null && systemQuantity != null) {
            this.difference = physicalQuantity - systemQuantity;
            updateStatus();
        }
    }

    private void updateStatus() {
        if (physicalQuantity == null) {
            this.status = InventoryItemStatus.PENDING;
        } else if (difference == null) {
            this.status = InventoryItemStatus.PENDING;
        } else if (difference == 0) {
            this.status = InventoryItemStatus.VALIDATED;
        } else if (difference < 0) {
            this.status = InventoryItemStatus.DEBT;
        } else {
            this.status = InventoryItemStatus.SURPLUS;
        }
    }

    public void addReconciliation(InventoryReconciliation reconciliation) {
        reconciliations.add(reconciliation);
        reconciliation.setInventoryItem(this);
    }
}

