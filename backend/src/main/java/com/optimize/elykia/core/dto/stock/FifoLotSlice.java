package com.optimize.elykia.core.dto.stock;

import lombok.Builder;
import lombok.Value;

import java.util.ArrayList;
import java.util.List;

@Value
@Builder
public class FifoLotSlice {
    Long lotId;
    int quantity;
    double unitPurchasePrice;
    Double unitSalePrice;
    Double wholesalePurchasePrice;
    Double wholesaleSalePrice;
    Double halfWholesalePurchasePrice;
    Double halfWholesaleSalePrice;
    Integer unitsPerPackage;
    Integer unitsPerHalfPackage;
    @Builder.Default
    List<PackPrice> salePacks = new ArrayList<>();

    @Value
    public static class PackPrice {
        int quantity;
        double salePrice;
    }
}
