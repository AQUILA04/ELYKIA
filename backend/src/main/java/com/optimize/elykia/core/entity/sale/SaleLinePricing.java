package com.optimize.elykia.core.entity.sale;

import com.optimize.elykia.core.enumaration.SalePackMode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.Setter;

@Embeddable
@Getter
@Setter
public class SaleLinePricing {

    @Enumerated(EnumType.STRING)
    @Column(name = "sale_pack_mode", length = 32)
    private SalePackMode salePackMode;

    @Column(name = "pack_label")
    private String packLabel;

    @Column(name = "pack_count")
    private Integer packCount;

    @Column(name = "units_per_pack")
    private Integer unitsPerPack;

    @Column(name = "pack_price")
    private Double packPrice;

    @Column(name = "line_amount")
    private Double lineAmount;

    @Column(name = "line_purchase_amount")
    private Double linePurchaseAmount;

    @Column(name = "line_margin")
    private Double lineMargin;
}
