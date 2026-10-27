package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RmDailyJournalPdfDto {
    private String journalDate;
    private String operatorLabel;
    private String generationDate;
    private int operationCount;
    private long syncedCount;
    private long localCount;
    private long failedCount;
    private List<Operation> operations;

    @Data
    @Builder
    public static class Operation {
        private String operationType;
        private String dossier;
        private String time;
        private String status;
        private String detail;
    }
}
