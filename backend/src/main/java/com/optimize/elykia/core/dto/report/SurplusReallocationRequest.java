package com.optimize.elykia.core.dto.report;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class SurplusReallocationRequest {
    private String commercialUsername;
    private LocalDate startDate;
    private LocalDate endDate;
    /** Décoché par défaut : le surplus sert le crédit et la tontine, pas les soldes. */
    private Boolean includeNewBalance;
    /** Jours servis en premier, du plus ancien au plus récent. */
    private List<LocalDate> priorityDates;
}
