package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.StockOperationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleHistoryDto {
    private Long id;
    private StockOperationType operationType;
    private Integer initialQuantity;
    private Integer operationQuantity;
    private Integer finalQuantity;
    private LocalDate operationDate;
    private String operationUser;
}
