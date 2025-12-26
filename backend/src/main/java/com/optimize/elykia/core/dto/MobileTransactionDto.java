package com.optimize.elykia.core.dto;

import java.time.LocalDate;

public record MobileTransactionDto(Long id,
                                   String clientId,
                                   String referenceId,
                                   String type,
                                   Double amount,
                                   String details,
                                   LocalDate date,
                                   String commercialId) {
}
