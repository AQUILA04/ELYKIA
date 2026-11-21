package com.optimize.elykia.inventory.web.dto;

import com.optimize.elykia.inventory.domain.StockHistoryReferenceType;
import com.optimize.elykia.inventory.domain.StockOperationType;
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
    private String beneficiary;
    private StockHistoryReferenceType referenceType;
    private Long referenceId;
    private String referenceLabel;
}
