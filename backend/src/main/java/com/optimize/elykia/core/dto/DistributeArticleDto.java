package com.optimize.elykia.core.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.sale.Order;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@Validated
public class DistributeArticleDto {
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
    private String reference;

    public void validateEntryArticles() {
        if (Objects.isNull(articles) || articles.getArticleEntries().isEmpty()) {
            throw new CustomValidationException("Articles is empty");
        }
    }

    @JsonIgnore
    public static DistributeArticleDto fromOrder(Order order){
        DistributeArticleDto distributeArticleDto = new DistributeArticleDto();
        distributeArticleDto.setClientId(order.getClient().getId());

        Set<StockEntry> stockEntries = order.getItems().stream()
                .map(orderItem -> {
                    StockEntry stockEntry = new StockEntry();
                    stockEntry.setArticleId(orderItem.getArticle().getId());
                    stockEntry.setQuantity(orderItem.getQuantity());
                    stockEntry.setUnitPrice(orderItem.getUnitPrice());
                    return stockEntry;
                })
                .collect(Collectors.toSet());

        StockEntryDto stockEntryDto = new StockEntryDto();
        stockEntryDto.setArticleEntries(stockEntries);
        distributeArticleDto.setArticles(stockEntryDto);
        distributeArticleDto.setAdvance(0.0);
        return distributeArticleDto;
    }
}
