package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SpecialDailyStakeResponseDto {
    private List<String> successRecoveryIds;
    private List<FailedRecoveryDto> failedRecoveries;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FailedRecoveryDto {
        private String recoveryId;
        private String errorMessage;
    }
}
