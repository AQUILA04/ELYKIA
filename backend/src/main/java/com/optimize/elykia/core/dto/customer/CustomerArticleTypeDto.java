package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CustomerArticleTypeDto {
    /** Valeur du filtre catalogue (articles.type). */
    private String type;
    /** Libellé affiché dans les filtres rapides. */
    private String label;
    private long totalQuantitySold;
}
