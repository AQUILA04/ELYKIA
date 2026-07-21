package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.StockHistoryReferenceType;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ArticleHistoryContext {
    String beneficiary;
    StockHistoryReferenceType referenceType;
    Long referenceId;
    String referenceLabel;

    public static ArticleHistoryContext beneficiaryOnly(String beneficiary) {
        return ArticleHistoryContext.builder()
                .beneficiary(beneficiary)
                .build();
    }

    public static ArticleHistoryContext withReference(
            String beneficiary,
            StockHistoryReferenceType referenceType,
            Long referenceId,
            String referenceLabel) {
        return ArticleHistoryContext.builder()
                .beneficiary(beneficiary)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .referenceLabel(referenceLabel)
                .build();
    }
}
