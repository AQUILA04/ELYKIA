package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.entities.util.TontineParameterConstant;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

@Component
@RequiredArgsConstructor
public class TontineAmountHistoryHelper {

    private final ParameterService parameterService;

    public Double getApplicableAmountForDate(TontineMember member, LocalDate date, LocalDate referenceDate) {
        return applicableAmount(member.getAmount(), member.getAmountHistory(), date, referenceDate);
    }

    public double getDailyAmountForMonth(TontineMember member, YearMonth month) {
        return getDailyAmountForMonth(member.getAmount(), member.getAmountHistory(), month);
    }

    /**
     * Mise en vigueur au dernier jour du mois.
     * La liste est lue telle quelle : la collection de l'entité n'est pas remplacée.
     */
    public double getDailyAmountForMonth(
            Double currentAmount,
            List<TontineMemberAmountHistory> history,
            YearMonth month) {
        LocalDate lastDay = month.atEndOfMonth();
        Double amount = applicableAmount(currentAmount, history, lastDay, lastDay);
        return amount != null && amount > 0 ? amount : 0.0;
    }

    private Double applicableAmount(
            Double currentAmount,
            List<TontineMemberAmountHistory> history,
            LocalDate date,
            LocalDate referenceDate) {
        LocalDate lookupDate = date.withDayOfMonth(date.lengthOfMonth());
        if (lookupDate.isAfter(referenceDate)) {
            lookupDate = referenceDate;
        }
        final LocalDate endOfMonth = lookupDate;

        if (history == null || history.isEmpty()) {
            return currentAmount;
        }

        return history.stream()
                .filter(h -> h.getStartDate() != null && !h.getStartDate().isAfter(endOfMonth))
                .filter(h -> h.getEndDate() == null || !h.getEndDate().isBefore(endOfMonth))
                .sorted(Comparator.comparing(TontineMemberAmountHistory::getStartDate).reversed())
                .map(TontineMemberAmountHistory::getAmount)
                .findFirst()
                .orElse(currentAmount);
    }

    public LocalDate getEffectiveMemberStartDate(TontineMember member) {
        LocalDate startDate = member.getTontineSession().getStartDate();
        boolean useRegistrationDate = parameterService.isEnabled(
                TontineParameterConstant.USE_MEMBER_REGISTRATION_DATE_FOR_SHARE);
        if (useRegistrationDate && member.getRegistrationDate() != null) {
            LocalDate regDate = member.getRegistrationDate().toLocalDate();
            if (regDate.isAfter(startDate)) {
                startDate = regDate;
            }
        }
        return startDate;
    }
}
