package com.optimize.elykia.tontine.domain;


import java.time.LocalDate;
import java.util.List;

public interface TontineAllocationPolicy {

    String version();

    double processCollectionAllocation(
            TontineMember member,
            double amountCollected,
            LocalDate allocationDate,
            boolean advanceToNextMonth,
            LocalDate contributionMonth);

    void recalculateMemberFromCollections(TontineMember member, List<TontineCollection> collections);

    double calculateTargetSocietyShare(TontineMember member, LocalDate upToDateInclusive);
}
