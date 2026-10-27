package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.TontineMemberFrequency;
import com.optimize.elykia.core.enumaration.TontineMemberUpdateScope;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TontineMemberDto {
    @NotNull(message = "L'ID du client ne peut pas être nul.")
    private Long clientId;
    /** Session cible. Absente : la session annuelle de l'année est utilisée. */
    private Long sessionId;
    private TontineMemberFrequency frequency;
    private Double amount;
    private String notes;
    private Double societyShare;
    private Double availableContribution;
    private Integer validatedMonths;
    private Integer currentMonthDays;
    private Double totalDeliveryCollections;
    private TontineMemberUpdateScope updateScope;
    private String operationConsentCode;
    private String syncConsentCode;
}
