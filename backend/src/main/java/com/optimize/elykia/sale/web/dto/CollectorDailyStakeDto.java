package com.optimize.elykia.sale.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Data
public class CollectorDailyStakeDto {
    @Valid
    private List<DefaultDailyStakeUnitDto> stakeUnits;
    /** Compatibilité ascendante avec l'ancien payload TFJ navigateur en cache. */
    private List<Long> creditIds;
    /** Compatibilité ascendante avec l'ancien payload TFJ navigateur en cache. */
    private List<Long> clientIds;
    @NotBlank(message = "Le nom du collecteur est obligatoire !")
    private String collector;
    private String syncConsentCode;

    public List<DefaultDailyStakeUnitDto> resolveEffectiveStakeUnits() {
        if (stakeUnits != null && !stakeUnits.isEmpty()) {
            return stakeUnits;
        }
        if (creditIds != null && !creditIds.isEmpty()) {
            return creditIds.stream()
                    .filter(java.util.Objects::nonNull)
                    .map(creditId -> {
                        DefaultDailyStakeUnitDto unit = new DefaultDailyStakeUnitDto();
                        unit.setCreditId(creditId);
                        unit.setRecoveryId("TFJ-LEGACY-" + creditId + "-" + UUID.randomUUID().toString().substring(0, 8));
                        return unit;
                    })
                    .toList();
        }
        return Collections.emptyList();
    }
}
