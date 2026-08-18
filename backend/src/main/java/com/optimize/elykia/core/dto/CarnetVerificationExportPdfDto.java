package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CarnetVerificationExportPdfDto {
    private String title;
    private String statusLabel;
    private String commercialLabel;
    private Integer sessionYear;
    private String generationDate;
    private int memberCount;
    private List<Page> pages;

    @Getter
    @Builder
    public static class Page {
        private List<List<Row>> columns;
    }

    @Getter
    @Builder
    public static class Row {
        private String displayName;
        private String clientCode;
    }
}
