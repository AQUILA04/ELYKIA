package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerIdDocumentRequest {

    @NotBlank
    @Size(max = 50)
    private String cardType;

    @NotBlank
    @Size(max = 100)
    private String cardID;

    /** Photo de la pièce d'identité en base64. */
    @NotBlank
    private String cardPhoto;
}
