package com.optimize.elykia.core.dto.sale;

import com.optimize.elykia.core.dto.CreditFieldControlDto;
import com.optimize.elykia.core.dto.CreditLateDTO;
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
    private List<CreditFieldControlDto> creditFieldControlsToday;
    /** Reserved for V2 tontine controls. */
    private List<Object> tontineMembers;
    private List<Object> tontineFieldControlsToday;
}
