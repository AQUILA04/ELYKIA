package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.util.TontineParameterConstant;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

@Component
@RequiredArgsConstructor
public class V2TontineAllocationPolicy implements TontineAllocationPolicy {

    private static final int DAYS_PER_MONTH = 31;
    private static final int MAX_MONTHS = 10;

    private final TontineAmountHistoryHelper amountHelper;

    @Override
    public String version() {
        return TontineParameterConstant.SOCIETY_SHARE_VERSION_V2;
    }

    @Override
    public double processCollectionAllocation(
            TontineMember member,
            double amountCollected,
            LocalDate allocationDate,
            boolean advanceToNextMonth,
            LocalDate contributionMonth) {
        throw new UnsupportedOperationException(
                "V2 utilise recalculateMemberFromCollections pour garantir la cohérence multi-mois.");
    }

    @Override
    public void recalculateMemberFromCollections(TontineMember member, List<TontineCollection> collections) {
        V2AllocationState state = new V2AllocationState(member, amountHelper);
        for (TontineCollection collection : collections) {
            state.applyCollection(collection);
        }
        state.applyToMember(member);
    }

    @Override
    public double calculateTargetSocietyShare(TontineMember member, LocalDate upToDateInclusive) {
        if (member.getAmount() == null) {
            return 0.0;
        }
        return member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;
    }

    private static final class V2MonthBucket {
        private final YearMonth month;
        private final double dailyAmount;
        private double societyShareTarget;
        private double societySharePaid;
        private double capital;

        private V2MonthBucket(YearMonth month, double dailyAmount) {
            this.month = month;
            this.dailyAmount = dailyAmount;
        }
    }

    private final class V2AllocationState {
        private final TontineMember member;
        private final TontineAmountHistoryHelper helper;
        private final Map<YearMonth, V2MonthBucket> months = new TreeMap<>();
        private final Set<YearMonth> openedSocietyMonths = new HashSet<>();
        private double totalContribution;
        private double totalSocietyShare;

        private V2AllocationState(TontineMember member, TontineAmountHistoryHelper helper) {
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
            LocalDate resolvedContributionMonth;

            if (!advance) {
                societyShareAmount = applyAmountToMonth(baseMonth, amount);
                resolvedContributionMonth = baseMonth.atDay(1);
            } else {
                V2MonthBucket bucket = getOrCreate(baseMonth);
                int currentDays = daysInMonth(bucket);

                if (currentDays >= DAYS_PER_MONTH) {
                    YearMonth nextMonth = baseMonth.plusMonths(1);
                    societyShareAmount = applyAmountToMonth(nextMonth, amount);
                    resolvedContributionMonth = nextMonth.atDay(1);
                } else {
                    double remaining = amount;
                    double societyOnCurrent = paySocietyShare(baseMonth, remaining);
                    remaining -= societyOnCurrent;

                    double capitalNeededFor31 = Math.max(0.0, (DAYS_PER_MONTH - currentDays) * bucket.dailyAmount);

                    if (remaining <= capitalNeededFor31 + 0.0001) {
                        int projectedDays = currentDays
                                + (bucket.dailyAmount > 0 ? (int) (remaining / bucket.dailyAmount) : 0);
                        if (projectedDays < DAYS_PER_MONTH) {
                            throw new CustomValidationException(
                                    "Impossible de passer au mois suivant : le mois courant n'atteint pas 31 jours de cotisation.");
                        }
                        addCapital(baseMonth, remaining);
                        societyShareAmount = societyOnCurrent;
                        resolvedContributionMonth = baseMonth.atDay(1);
                    } else {
                        addCapital(baseMonth, capitalNeededFor31);
                        double overflow = remaining - capitalNeededFor31;
                        YearMonth nextMonth = baseMonth.plusMonths(1);
                        double societyOnNext = applyAmountToMonth(nextMonth, overflow);
                        societyShareAmount = societyOnCurrent + societyOnNext;
                        resolvedContributionMonth = nextMonth.atDay(1);
                    }
                }
            }

            collection.setSocietyShareAmount(societyShareAmount);
            collection.setContributionMonth(resolvedContributionMonth);
            totalContribution += amount;
        }

        private double applyAmountToMonth(YearMonth month, double amount) {
            double society = paySocietyShare(month, amount);
            addCapital(month, amount - society);
            return society;
        }

        private double paySocietyShare(YearMonth month, double amount) {
            V2MonthBucket bucket = getOrCreate(month);
            openMonthForSocietyShareIfNeeded(bucket);
            double deficit = Math.max(0.0, bucket.societyShareTarget - bucket.societySharePaid);
            double paid = Math.min(amount, deficit);
            bucket.societySharePaid += paid;
            totalSocietyShare += paid;
            return paid;
        }

        private void openMonthForSocietyShareIfNeeded(V2MonthBucket bucket) {
            if (bucket.societyShareTarget > 0) {
                return;
            }
            if (openedSocietyMonths.size() >= MAX_MONTHS) {
                return;
            }
            bucket.societyShareTarget = bucket.dailyAmount;
            openedSocietyMonths.add(bucket.month);
        }

        private void addCapital(YearMonth month, double capitalAmount) {
            if (capitalAmount <= 0) {
                return;
            }
            getOrCreate(month).capital += capitalAmount;
        }

        private V2MonthBucket getOrCreate(YearMonth month) {
            return months.computeIfAbsent(month, m -> new V2MonthBucket(m, helper.getDailyAmountForMonth(member, m)));
        }

        private int daysInMonth(V2MonthBucket bucket) {
            if (bucket.dailyAmount <= 0) {
                return 0;
            }
            return (int) (bucket.capital / bucket.dailyAmount);
        }

        private void applyToMember(TontineMember member) {
            member.setTotalContribution(totalContribution);
            member.setSocietyShare(totalSocietyShare);
            member.setAvailableContribution(Math.max(0.0, totalContribution - totalSocietyShare));

            int validatedMonths = 0;
            YearMonth latestMonth = null;
            int latestDays = 0;

            for (V2MonthBucket bucket : months.values()) {
                if (bucket.capital <= 0 && bucket.societySharePaid <= 0) {
                    continue;
                }
                int days = daysInMonth(bucket);
                if (days >= DAYS_PER_MONTH && validatedMonths < MAX_MONTHS) {
                    validatedMonths++;
                }
                latestMonth = bucket.month;
                latestDays = days;
            }

            member.setValidatedMonths(validatedMonths);
            member.setCurrentMonthDays(latestMonth != null ? latestDays : 0);
        }
    }
}
