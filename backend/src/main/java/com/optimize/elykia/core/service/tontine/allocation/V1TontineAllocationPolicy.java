package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.entities.util.TontineParameterConstant;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class V1TontineAllocationPolicy implements TontineAllocationPolicy {

    private static final int DAYS_PER_MONTH = 31;
    private static final int MAX_MONTHS = 10;

    private final TontineAmountHistoryHelper amountHelper;

    @Override
    public String version() {
        return TontineParameterConstant.SOCIETY_SHARE_VERSION_V1;
    }

    @Override
    public double processCollectionAllocation(
            TontineMember member,
            double amountCollected,
            LocalDate allocationDate,
            boolean advanceToNextMonth,
            LocalDate contributionMonth) {
        double currentSocietyShare = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;
        double currentTotalContribution = member.getTotalContribution() != null ? member.getTotalContribution() : 0.0;

        double targetSocietyShare = calculateTargetSocietyShare(member, allocationDate);
        double societyShareDeficit = Math.max(0.0, targetSocietyShare - currentSocietyShare);

        double amountForSociety = 0.0;
        if (societyShareDeficit > 0) {
            amountForSociety = Math.min(amountCollected, societyShareDeficit);
        }

        member.setSocietyShare(currentSocietyShare + amountForSociety);
        member.setTotalContribution(currentTotalContribution + amountCollected);
        calculateMemberStatus(member);
        return amountForSociety;
    }

    @Override
    public void recalculateMemberFromCollections(TontineMember member, List<TontineCollection> collections) {
        member.setSocietyShare(0.0);
        member.setTotalContribution(0.0);
        member.setValidatedMonths(0);
        member.setCurrentMonthDays(0);
        member.setAvailableContribution(0.0);

        for (TontineCollection collection : collections) {
            LocalDate allocationDate = collection.getCollectionDate().toLocalDate();
            double societyShareAmount = processCollectionAllocation(
                    member,
                    collection.getAmount(),
                    allocationDate,
                    false,
                    allocationDate.withDayOfMonth(1));
            collection.setSocietyShareAmount(societyShareAmount);
            if (collection.getContributionMonth() == null) {
                collection.setContributionMonth(allocationDate.withDayOfMonth(1));
            }
        }
    }

    @Override
    public double calculateTargetSocietyShare(TontineMember member, LocalDate upToDateInclusive) {
        LocalDate startDate = amountHelper.getEffectiveMemberStartDate(member);
        double targetSocietyShare = 0.0;
        LocalDate iterDate = startDate;
        int monthsCounted = 0;

        while (!iterDate.isAfter(upToDateInclusive) && monthsCounted < MAX_MONTHS) {
            Double applicableAmount = amountHelper.getApplicableAmountForDate(member, iterDate, upToDateInclusive);
            targetSocietyShare += applicableAmount != null ? applicableAmount : 0.0;
            monthsCounted++;
            iterDate = iterDate.plusMonths(1);
        }
        return targetSocietyShare;
    }

    private void calculateMemberStatus(TontineMember member) {
        if (member.getAmount() == null || member.getAmount() == 0) {
            return;
        }

        double dailyAmount = member.getAmount();
        double totalContrib = member.getTotalContribution() != null ? member.getTotalContribution() : 0.0;
        double societyShare = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;

        double availableContribution = Math.max(0.0, totalContrib - societyShare);
        int totalDaysAvailable = (int) (availableContribution / dailyAmount);
        int validatedMonths = totalDaysAvailable / DAYS_PER_MONTH;
        int remainderDays = totalDaysAvailable % DAYS_PER_MONTH;

        if (validatedMonths >= MAX_MONTHS) {
            validatedMonths = MAX_MONTHS;
            remainderDays = 0;
        }

        member.setValidatedMonths(validatedMonths);
        member.setCurrentMonthDays(remainderDays);
        member.setAvailableContribution(availableContribution);
    }
}
