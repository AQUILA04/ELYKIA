package com.optimize.elykia.inventory.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "warehouse_stock_transfer_lot_slice")
@Getter
@Setter
@NoArgsConstructor
public class WarehouseStockTransferLotSlice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_item_id", nullable = false)
    @JsonIgnore
    private WarehouseStockTransferItem transferItem;

    @Column(name = "source_lot_id", nullable = false)
    private Long sourceLotId;

    @Column(name = "target_lot_id")
    private Long targetLotId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_purchase_price", nullable = false)
    private Double unitPurchasePrice;

    @Column(name = "unit_sale_price")
    private Double unitSalePrice;
}
