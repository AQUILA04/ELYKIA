package com.optimize.elykia.inventory.web.dto;

import com.optimize.elykia.inventory.domain.ArticleStockLotSourceType;
import com.optimize.elykia.inventory.domain.ArticleStockLotStatus;
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
