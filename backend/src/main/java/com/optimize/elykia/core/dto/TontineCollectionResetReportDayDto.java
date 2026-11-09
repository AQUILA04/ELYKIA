package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.report.TontineCollectionResetReportDay;

import java.time.LocalDate;

public record TontineCollectionResetReportDayDto(
        Long id,
        String commercialUsername,
        LocalDate reportDate,
        Double collectionsAmountBefore,
        Integer collectionsCountBefore,
        Double catchupAmountBefore,
        Integer catchupCountBefore,
        Double amountToDepositBefore,
        Double collectionsAmountAfter,
        Integer collectionsCountAfter,
        Double catchupAmountAfter,
        Integer catchupCountAfter,
        Double amountToDepositAfter,
        Double amountDeposited,
        Double tontineAmountDeposited
) {
    public static TontineCollectionResetReportDayDto from(TontineCollectionResetReportDay day) {
        return new TontineCollectionResetReportDayDto(
                day.getId(),
                day.getCommercialUsername(),
                day.getReportDate(),
                day.getCollectionsAmountBefore(),
                day.getCollectionsCountBefore(),
                day.getCatchupAmountBefore(),
                day.getCatchupCountBefore(),
                day.getAmountToDepositBefore(),
                day.getCollectionsAmountAfter(),
                day.getCollectionsCountAfter(),
                day.getCatchupAmountAfter(),
                day.getCatchupCountAfter(),
                day.getAmountToDepositAfter(),
                day.getAmountDeposited(),
                day.getTontineAmountDeposited()
        );
    }
}
