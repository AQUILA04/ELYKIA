package com.optimize.elykia.core.dto;

import java.time.LocalDate;


public record RecoveryDto(Long id,
                          Double amount,
                          LocalDate paymentDate,
                          String paymentMethod,
                          String notes,
                          String distributionId,
                          String clientId,
                          String commercialId,
                          LocalDate createdAt,
                          LocalDate syncDate
                          ) {}
