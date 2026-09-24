package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.sale.SaleCancellationRun;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.SaleCancellationRunStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleCancellationRunDto {
    private Long id;
    private String commercialUsername;
    private LocalDate startDate;
    private LocalDate endDate;
    private CreditStatus creditStatus;
    private SaleCancellationRunStatus status;
    private String cancellationReason;
    private String triggeredBy;
    private LocalDateTime createdDate;

    private Integer totalSalesFound;
    private Integer cancelledSalesCount;
    private Double cancelledSalesAmount;
    private Integer excludedSalesCount;
    private Double excludedSalesAmount;
    private Integer pdfFileCount;

    private String archiveFileName;
    private String errorMessage;
    private List<SaleCancellationFileDto> files;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SaleCancellationFileDto {
        private Long id;
        private String fileName;
        private String fileType;
        private String creditReference;
        private String clientName;
        private Double amount;
    }

    public static SaleCancellationRunDto fromEntity(SaleCancellationRun entity) {
        return SaleCancellationRunDto.builder()
                .id(entity.getId())
                .commercialUsername(entity.getCommercialUsername())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .creditStatus(entity.getCreditStatus())
                .status(entity.getStatus())
                .cancellationReason(entity.getCancellationReason())
                .triggeredBy(entity.getTriggeredBy())
                .createdDate(entity.getCreatedDate())
                .totalSalesFound(entity.getTotalSalesFound())
                .cancelledSalesCount(entity.getCancelledSalesCount())
                .cancelledSalesAmount(entity.getCancelledSalesAmount())
                .excludedSalesCount(entity.getExcludedSalesCount())
                .excludedSalesAmount(entity.getExcludedSalesAmount())
                .pdfFileCount(entity.getPdfFileCount())
                .archiveFileName(entity.getArchiveFileName())
                .errorMessage(entity.getErrorMessage())
                .build();
    }
}
