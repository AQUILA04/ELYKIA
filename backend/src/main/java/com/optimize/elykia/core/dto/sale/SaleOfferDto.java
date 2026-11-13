package com.optimize.elykia.core.dto.sale;

import com.optimize.elykia.core.enumaration.SalePackMode;
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
