package com.optimize.elykia.core.dto.adhesion;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RejectAdhesionSubmissionRequest {
    @NotBlank
    private String reason;
}
