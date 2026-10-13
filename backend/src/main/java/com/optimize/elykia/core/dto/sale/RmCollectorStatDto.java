package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RmCollectorStatDto {
    private String username;
    private long lateCount;
    private double totalAmountRemaining;
    /** Membres tontine de la session en cours, y compris sans retard de cotisation. */
    private long tontineMemberCount;
    private List<String> quarters;
}
