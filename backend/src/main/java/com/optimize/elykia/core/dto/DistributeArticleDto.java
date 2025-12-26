package com.optimize.elykia.core.dto;

import com.optimize.common.entities.exception.CustomValidationException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDate;
import java.util.Objects;

@Data
@Validated
public class DistributeArticleDto {
    @NotNull
    private Long creditId;
    @NotNull
    private Long clientId;
    @NotNull
    @Valid
    private StockEntryDto articles;
    private Double advance;
    private Double dailyStake;
    private LocalDate endDate;
    private LocalDate startDate;
    private Double totalAmount;
    private Double totalAmountPaid;
    private Double totalAmountRemaining;
    private Boolean mobile;

    public void validateEntryArticles() {
        if (Objects.isNull(articles) || articles.getArticleEntries().isEmpty()) {
            throw new CustomValidationException("Articles is empty");
        }
    }
}
