package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.entities.util.TontineParameterConstant;
import com.optimize.common.securities.service.ParameterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TontineAllocationPolicyResolver {

    private final ParameterService parameterService;
    private final V1TontineAllocationPolicy v1Policy;
    private final V2TontineAllocationPolicy v2Policy;

    public TontineAllocationPolicy resolve() {
        String version = parameterService.getValue(TontineParameterConstant.SOCIETY_SHARE_VERSION);
        if (TontineParameterConstant.SOCIETY_SHARE_VERSION_V2.equalsIgnoreCase(version)) {
            return v2Policy;
        }
        return v1Policy;
    }

    public boolean isV2() {
        return v2Policy == resolve();
    }
}
