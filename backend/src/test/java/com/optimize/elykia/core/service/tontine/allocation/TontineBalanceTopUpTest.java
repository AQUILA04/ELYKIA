package com.optimize.elykia.core.service.tontine.allocation;

import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class TontineBalanceTopUpTest {

    @Test
    void topUpIncreasesTheAvailableBalanceInFull() {
        V2TontineAllocationPolicy policy = new V2TontineAllocationPolicy(
                new TontineAmountHistoryHelper(mock(ParameterService.class)));
        TontineMember member = new TontineMember();
        member.setAmount(100d);

        TontineCollection topUp = new TontineCollection();
        topUp.setAmount(10_000d);
        topUp.setBalanceTopUp(true);
        topUp.setCollectionDate(LocalDateTime.of(2026, 12, 2, 10, 0));

        policy.recalculateMemberFromCollections(member, List.of(topUp));

        assertEquals(10_000d, member.getTotalContribution());
        assertEquals(10_000d, member.getAvailableContribution());
        assertEquals(0d, member.getSocietyShare());
        assertEquals(0d, topUp.getSocietyShareAmount());
    }
}
