package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.util.TontineParameterConstant;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.List;
import java.util.TreeMap;

/**
 * V3 : une mise société est prélevée dès qu'un mois de cotisation est entamé (même sans 31 jours),
 * puis une mise supplémentaire à chaque nouveau bloc de 31 jours collectés dans ce mois
 * (32e jour, 63e jour, 94e jour...). Les jours sont comptés bruts : montant collecté / mise du mois.
 * Aucun plafond de mois ou de mises.
 */
@Component
@RequiredArgsConstructor
public class V3TontineAllocationPolicy implements TontineAllocationPolicy {

    static final int DAYS_PER_BLOCK = 31;
    private static final double EPSILON = 0.0001;

    private final TontineAmountHistoryHelper amountHelper;

    @Override
    public String version() {
        return TontineParameterConstant.SOCIETY_SHARE_VERSION_V3;
    }

    @Override
    public double processCollectionAllocation(
            TontineMember member,
            double amountCollected,
            LocalDate allocationDate,
            boolean advanceToNextMonth,
            LocalDate contributionMonth) {
        throw new UnsupportedOperationException(
                "V3 utilise recalculateMemberFromCollections pour garantir la cohérence multi-mois.");
    }

    @Override
    public void recalculateMemberFromCollections(TontineMember member, List<TontineCollection> collections) {
        State state = new State(member, amountHelper);
        for (TontineCollection collection : TontineBalanceTopUp.regular(collections)) {
            state.applyCollection(collection);
        }
        state.applyToMember(member);
        TontineBalanceTopUp.apply(member, collections);
    }

    @Override
    public double calculateTargetSocietyShare(TontineMember member, LocalDate upToDateInclusive) {
        return member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;
    }

    /** Nombre de mises dues pour un cumul brut donné dans un mois. */
    static int societyBlocks(double grossAmount, double dailyAmount) {
        if (dailyAmount <= 0 || grossAmount <= EPSILON) {
            return 0;
        }
        return (int) Math.ceil(grossAmount / (DAYS_PER_BLOCK * dailyAmount) - EPSILON);
    }

    private static final class Bucket {
        private final double dailyAmount;
        private double gross;
        private double societyPaid;

        private Bucket(double dailyAmount) {
            this.dailyAmount = dailyAmount;
        }

        private double grossDays() {
            return dailyAmount > 0 ? gross / dailyAmount : 0.0;
        }
    }

    private static final class State {
        private final TontineMember member;
        private final TontineAmountHistoryHelper helper;
        private final Map<YearMonth, Bucket> months = new TreeMap<>();
        private double totalContribution;
        private double totalSocietyShare;

        private State(TontineMember member, TontineAmountHistoryHelper helper) {
            this.member = member;
            this.helper = helper;
        }

        private void applyCollection(TontineCollection collection) {
            LocalDate allocationDate = collection.getCollectionDate().toLocalDate();
            YearMonth baseMonth = collection.getContributionMonth() != null
                    ? YearMonth.from(collection.getContributionMonth())
                    : YearMonth.from(allocationDate);
            boolean advance = Boolean.TRUE.equals(collection.getAdvanceToNextMonth());
            double amount = collection.getAmount() != null ? collection.getAmount() : 0.0;

            double societyShareAmount;
            YearMonth resolved = baseMonth;

            if (!advance) {
                societyShareAmount = applyToMonth(baseMonth, amount);
            } else {
                Bucket bucket = bucket(baseMonth);
                double blockAmount = DAYS_PER_BLOCK * bucket.dailyAmount;
                double needed = Math.max(0.0, blockAmount - bucket.gross);
                if (bucket.gross >= blockAmount - EPSILON) {
                    resolved = baseMonth.plusMonths(1);
                    societyShareAmount = applyToMonth(resolved, amount);
                } else if (amount <= needed + EPSILON) {
                    int projectedDays = bucket.dailyAmount > 0
                            ? (int) ((bucket.gross + amount) / bucket.dailyAmount + EPSILON) : 0;
                    if (projectedDays < DAYS_PER_BLOCK) {
                        throw new CustomValidationException(
                                "Impossible de passer au mois suivant : le mois courant n'atteint pas 31 jours de cotisation.");
                    }
                    societyShareAmount = applyToMonth(baseMonth, amount);
                } else {
                    double onCurrent = applyToMonth(baseMonth, needed);
                    resolved = baseMonth.plusMonths(1);
                    societyShareAmount = onCurrent + applyToMonth(resolved, amount - needed);
                }
            }

            collection.setSocietyShareAmount(societyShareAmount);
            collection.setContributionMonth(resolved.atDay(1));
            totalContribution += amount;
        }

        /** Ajoute le montant au mois et prélève les mises devenues dues. Retourne la part société prélevée. */
        private double applyToMonth(YearMonth month, double amount) {
            if (amount <= 0) {
                return 0.0;
            }
            Bucket bucket = bucket(month);
            bucket.gross += amount;
            double target = societyBlocks(bucket.gross, bucket.dailyAmount) * bucket.dailyAmount;
            double paid = Math.min(amount, Math.max(0.0, target - bucket.societyPaid));
            bucket.societyPaid += paid;
            totalSocietyShare += paid;
            return paid;
        }

        private Bucket bucket(YearMonth month) {
            return months.computeIfAbsent(month, m -> new Bucket(helper.getDailyAmountForMonth(member, m)));
        }

        private void applyToMember(TontineMember member) {
            member.setTotalContribution(totalContribution);
            member.setSocietyShare(totalSocietyShare);
            member.setAvailableContribution(Math.max(0.0, totalContribution - totalSocietyShare));
            // Les notions de mois validés / jours du mois courant ne pilotent plus la part société en V3.
            member.setValidatedMonths(0);
            member.setCurrentMonthDays(0);
        }
    }
}
