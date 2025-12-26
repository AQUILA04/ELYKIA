package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DownloadData {
    private String name;
    private Integer quantity;
    private Double creditSalePrice;
    private Double totalPrice;
}
