package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SoldArticleDto {
    private Long articleId;
    private String articleName;
    private Long totalQuantity;
    private String commercial;
}
