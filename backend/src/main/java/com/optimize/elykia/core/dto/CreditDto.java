package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.Set;

@Data
public class CreditDto {
    private Long id;
    @NotNull(message = "L'identifiant du client est obligatoire !")
    private Long clientId;
    @NotNull(message = "Les articles liés au crédit sont obligatoire !")
    @Valid
    private Set<CreditArticlesDto> articles;
    private LocalDate beginDate;
    private LocalDate expectedEndDate;
    private Double totalAmount;
    private Double advance;
}