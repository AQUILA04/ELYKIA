package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class RmPackTontineMemberDto {
    private Long id;
    private Long clientId;
    private String clientName;
    private String clientPhone;
    private String clientQuarter;
    private String tontineCollector;
    private Integer sessionYear;
    private Double amount;
    private Double totalContribution;
    private String deliveryStatus;
    private Boolean carnetVerified;
    private LocalDateTime carnetVerifiedAt;
    private String carnetVerifiedBy;
    /** Part société en place (calculée ou réajustée), pour la valider ou la corriger hors ligne. */
    private Double societyShare;
    /** AUTO, CONFIRMED ou ADJUSTED. */
    private String societyShareStatus;
    /** Déjà validée ou corrigée par un chef de recouvrement. */
    private Boolean societyShareLocked;
    /** Totaux mensuels agrégés (rétrocompat packs déjà téléchargés). */
    private List<RmPackTontineMonthDto> months;
    /** Répartition des montants système par commercial collecteur. */
    private List<RmPackTontineCollectorDto> collectors;
}
