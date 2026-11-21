package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.inventory.domain.SalePackMode;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class SaleOfferDto {
    SalePackMode mode;
    String label;
    int unitsPerPack;
    double salePrice;
    int maxPacks;
}
