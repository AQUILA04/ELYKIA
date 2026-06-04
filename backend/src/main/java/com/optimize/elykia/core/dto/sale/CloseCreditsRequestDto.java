package com.optimize.elykia.core.dto.sale;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CloseCreditsRequestDto {
    @NotEmpty
    @Valid
    private List<CreditCloseItemDto> items;
}
