package com.optimize.elykia.core.dto;


import com.optimize.elykia.core.entity.TontineMemberAmountHistory;
import org.springframework.data.domain.Page;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

public record TontineMemberAmountHistoryRespDto(Long id,
                                                TontineMemberRespDto tontineMember,
                                                Double amount,
                                                LocalDate startDate,
                                                LocalDateTime creationDate) {

    public TontineMemberAmountHistoryRespDto(Long id, Long tontineMemberId, Double amount, LocalDate startDate, LocalDateTime creationDate) {
        this(id, TontineMemberRespDto.fromId(tontineMemberId), amount, startDate, creationDate);
    }

    public static TontineMemberAmountHistoryRespDto fromId(Long id) {
        return new TontineMemberAmountHistoryRespDto(id, 0L, null, null, null);
    }

    public static TontineMemberAmountHistoryRespDto fromTontineMemberHistory(TontineMemberAmountHistory history) {
        if (Objects.isNull(history)) {
            return null;
        }

        return new TontineMemberAmountHistoryRespDto(history.getId(), TontineMemberRespDto.fromId(history.getTontineMember().getId()), history.getAmount(), history.getStartDate(), history.getCreationDate());
    }

    public static List<TontineMemberAmountHistoryRespDto> fromList(List<TontineMemberAmountHistory> memberAmountHistories) {
        if (memberAmountHistories == null) {
            return null;
        }

        return memberAmountHistories.stream().map(TontineMemberAmountHistoryRespDto::fromTontineMemberHistory).toList();
    }

    public static Page<TontineMemberAmountHistoryRespDto> fromPage(Page<TontineMemberAmountHistory> memberAmountHistories) {
        if (memberAmountHistories == null) {
            return null;
        }
        return memberAmountHistories.map(TontineMemberAmountHistoryRespDto::fromTontineMemberHistory);
    }
}
