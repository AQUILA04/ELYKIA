package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CloseCreditsResponseDto {
    private List<CreditCloseResultDto> successes;
    private List<CreditCloseResultDto> failures;
}
