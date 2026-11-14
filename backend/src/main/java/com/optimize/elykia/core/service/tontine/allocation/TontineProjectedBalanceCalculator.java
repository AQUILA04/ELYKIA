package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Solde net de fin de session si chaque mois est cotisé en entier :
 * 31 jours dont 1 jour de part société, donc 30 fois la mise du mois.
 */
@Component
@RequiredArgsConstructor
public class TontineProjectedBalanceCalculator {

    public static final int NET_DAYS_PER_MONTH = 30;
    public static final int MAX_MONTHS = 10;
    public static final double MONEY_TOLERANCE = 0.001;

    private final TontineAmountHistoryHelper amountHelper;

    public static boolean exceeds(double amount, double ceiling) {
        return amount > ceiling + MONEY_TOLERANCE;
    }

    public double project(TontineMember member) {
        return project(member, LocalDate.now());
    }

    public double project(TontineMember member, LocalDate asOf) {
        if (member == null || member.getTontineSession() == null) {
            return 0.0;
        }
        TontineSession session = member.getTontineSession();
        if (session.getStartDate() == null || session.getEndDate() == null) {
            return 0.0;
        }
        LocalDate start = amountHelper.getEffectiveMemberStartDate(member);
        LocalDate end = session.getEndDate();
        if (start == null || start.isAfter(end)) {
            return 0.0;
        }

        boolean historyOnly = isHistoryOnly(session, asOf, end);
        YearMonth cursor = YearMonth.from(start);
        YearMonth last = YearMonth.from(end);
        double total = 0.0;
        int counted = 0;
        while (!cursor.isAfter(last) && counted < MAX_MONTHS) {
            double stake = amountHelper.stakeForMonth(
                    member.getAmount(),
                    member.getAmountHistory(),
                    cursor,
                    historyOnly);
            total += NET_DAYS_PER_MONTH * stake;
            cursor = cursor.plusMonths(1);
            counted++;
        }
        return total;
    }

    private boolean isHistoryOnly(TontineSession session, LocalDate asOf, LocalDate sessionEnd) {
        TontineSessionStatus status = session.getStatus();
        if (status == TontineSessionStatus.CLOSED || status == TontineSessionStatus.ENDED) {
            return true;
        }
        return asOf != null && sessionEnd != null && asOf.isAfter(sessionEnd);
    }
}
