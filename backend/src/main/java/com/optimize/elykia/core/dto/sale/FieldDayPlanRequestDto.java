package com.optimize.elykia.core.dto.sale;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class FieldDayPlanRequestDto {

    @NotNull
    private LocalDate planDate;

    @NotEmpty
    @Size(min = 1, max = 3, message = "Sélectionnez entre 1 et 3 commerciaux")
    private List<String> commercialUsernames;

    /** Optional Client.quarter filter; empty = all. */
    private List<String> quarters;
}
