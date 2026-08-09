package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TontineCommercialMembersExportPdfDto {
    private String title;
    private String commercial;
    private Integer sessionYear;
    private String generationDate;
    private List<TontineMemberExportRowDto> members;
    private double totalContribution;
    private double totalSocietyShare;
    private double totalAvailable;
    private int memberCount;

    @Data
    @Builder
    public static class TontineMemberExportRowDto {
        private String clientCode;
        private String clientName;
        private double totalContribution;
        private double societyShare;
        private double availableContribution;
        private List<TontineMonthlyExportRowDto> months;
    }

    @Data
    @Builder
    public static class TontineMonthlyExportRowDto {
        private String monthLabel;
        private int collectionCount;
        private double totalAmount;
    }
}
