package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ComparisonMetricsDto {
    
    private Double memberGrowth;        // % de croissance des membres
    private Double collectionGrowth;    // % de croissance des collectes
    private Integer bestYear;           // Année avec le meilleur résultat
    private Integer worstYear;          // Année avec le moins bon résultat
}
