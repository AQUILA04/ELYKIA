package com.optimize.elykia.core.dto.sale;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RmClientContactUpdateDto {

    private String phone;

    private Double latitude;

    private Double longitude;

    private String mll;

    /** Idempotency key for mobile offline sync (optional). */
    @Size(max = 64)
    private String reference;
}
