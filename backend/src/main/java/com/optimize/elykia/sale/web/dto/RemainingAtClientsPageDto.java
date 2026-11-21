package com.optimize.elykia.sale.web.dto;

import org.springframework.data.domain.Page;

/**
 * Page des crédits encore dus + agrégats d'en-tête (somme des restes, nombre).
 */
public record RemainingAtClientsPageDto(
        Page<RemainingAtClientsCreditDto> content,
        long salesCount,
        double totalRemainingAmount
) {
}
