package com.optimize.elykia.core.dto.stock;

import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import com.optimize.elykia.core.enumaration.ArticleStockLotStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class ArticleStockLotDto {
    Long id;
    Long articleId;
    Integer quantityInitial;
    Integer quantityRemaining;
    Double unitPurchasePrice;
    LocalDate entryDate;
    ArticleStockLotSourceType sourceType;
    ArticleStockLotStatus status;
    Double remainingValue;
}
