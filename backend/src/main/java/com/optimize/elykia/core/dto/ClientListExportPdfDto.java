package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ClientListExportPdfDto {
    private String commercialLabel;
    private String commercialUsername;
    private String generationDate;
    private long totalRegistered;
    private long withActiveCredit;
    private long tontineMembers;
    private long withoutCreditNorTontine;
    private int clientCount;
    private List<QuarterGroup> groups;

    @Data
    @Builder
    public static class QuarterGroup {
        private String quarter;
        private List<Row> clients;
    }

    @Data
    @Builder
    public static class Row {
        private int index;
        private String lastname;
        private String firstname;
        private String phone;
        private String address;
        private boolean creditInProgress;
        private boolean tontineMember;
    }
}
