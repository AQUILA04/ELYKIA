package com.optimize.elykia.core.dto;

import com.optimize.elykia.inventory.domain.Articles;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestockNeededDto {

    private Articles article;
    private Long totalOrderedQuantity;
    private Integer currentStock;
    private Long difference;

}
