package com.optimize.elykia.core.dto.adhesion;

import com.optimize.elykia.core.enumaration.AdhesionType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubscribeAdhesionRequest {
    @NotNull
    private AdhesionType adhesionType;
}
