package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SoldArticlesSearchResultDto {
    private List<SoldArticleDto> content;
    private long totalElements;
    private int totalPages;
    private int number;
    private int size;
    /** Montant de toutes les lignes correspondant au filtre, toutes pages confondues. */
    private double totalAmount;
}
