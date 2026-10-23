package com.optimize.elykia.core.dto.sale;

import com.optimize.elykia.core.dto.CreditFieldControlDto;
import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.TontineMemberFieldControlDto;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class RmOfflinePackDto {

    private Long planId;
    private LocalDate planDate;
    private Instant generatedAt;
    private RmOfflinePackStatsDto stats;
    private List<RmCommercialRefDto> commercials;
    private List<CreditLateDTO> lateCredits;
    private List<RmPackClientDto> clients;
    /** Dernier contrôle par crédit du pack (nom de champ conservé). */
    private List<CreditFieldControlDto> creditFieldControlsToday;
    private List<RmPackTontineMemberDto> tontineMembers;
    /** Dernier contrôle par membre tontine du pack (nom de champ conservé). */
    private List<TontineMemberFieldControlDto> tontineFieldControlsToday;
}
