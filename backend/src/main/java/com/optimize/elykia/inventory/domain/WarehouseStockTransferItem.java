package com.optimize.elykia.inventory.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "warehouse_stock_transfer_item")
@Getter
@Setter
@NoArgsConstructor
public class WarehouseStockTransferItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_id", nullable = false)
    @JsonIgnore
    private WarehouseStockTransfer transfer;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "article_name", columnDefinition = "TEXT")
    private String articleName;

    @Column(name = "quantity_requested", nullable = false)
    private Integer quantityRequested;

    @Column(name = "quantity_shipped", nullable = false)
    private Integer quantityShipped = 0;

    @Column(name = "quantity_received", nullable = false)
    private Integer quantityReceived = 0;

    @Column(name = "average_unit_cost")
    private Double averageUnitCost;

    @OneToMany(mappedBy = "transferItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WarehouseStockTransferLotSlice> lotSlices = new ArrayList<>();

    public void addLotSlice(WarehouseStockTransferLotSlice slice) {
        lotSlices.add(slice);
        slice.setTransferItem(this);
    }
}
