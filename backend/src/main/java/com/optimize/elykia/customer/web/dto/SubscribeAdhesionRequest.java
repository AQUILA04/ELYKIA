package com.optimize.elykia.customer.web.dto;

import com.optimize.elykia.customer.domain.AdhesionType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubscribeAdhesionRequest {
    @NotNull
    private AdhesionType adhesionType;
}
