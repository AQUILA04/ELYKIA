package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

public record TontineMemberAmountHistoryItemDto(
        Long id,
        Double amount,
        LocalDate startDate,
        LocalDate endDate,
        LocalDateTime creationDate) {

    public static TontineMemberAmountHistoryItemDto fromEntity(TontineMemberAmountHistory history) {
        if (Objects.isNull(history)) {
            return null;
        }
        return new TontineMemberAmountHistoryItemDto(
                history.getId(),
                history.getAmount(),
                history.getStartDate(),
                history.getEndDate(),
                history.getCreationDate());
    }

    public static List<TontineMemberAmountHistoryItemDto> fromList(List<TontineMemberAmountHistory> histories) {
        if (histories == null || histories.isEmpty()) {
            return List.of();
        }
        return histories.stream()
                .sorted(Comparator.comparing(TontineMemberAmountHistory::getStartDate))
                .map(TontineMemberAmountHistoryItemDto::fromEntity)
                .toList();
    }
}
