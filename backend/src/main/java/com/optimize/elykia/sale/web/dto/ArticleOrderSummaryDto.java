package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.inventory.domain.Articles;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleOrderSummaryDto {

    private Articles article;
    private Long totalQuantity;

}
