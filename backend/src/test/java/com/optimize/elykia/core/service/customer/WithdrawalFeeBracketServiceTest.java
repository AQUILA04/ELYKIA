package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.customer.WithdrawalFeeBracketDto;
import com.optimize.elykia.core.entity.customer.MobileMoneyWithdrawalFeeBracket;
import com.optimize.elykia.core.repository.customer.MobileMoneyWithdrawalFeeBracketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WithdrawalFeeBracketServiceTest {

    @Mock
    private MobileMoneyWithdrawalFeeBracketRepository repository;

    @InjectMocks
    private WithdrawalFeeBracketService service;

    @Test
    void createRejectsOverlappingBracket() {
        MobileMoneyWithdrawalFeeBracket existing = bracket(1L, 1, 10_000, 200);
        when(repository.findByNetworkAndStateOrderByMinAmountAsc("MIXX", State.ENABLED)).thenReturn(List.of(existing));

        WithdrawalFeeBracketDto request = request("MIXX", 5_000, 15_000, 300);

        assertThrows(CustomValidationException.class, () -> service.create(request));
    }

    @Test
    void feeForReturnsConfiguredAmount() {
        MobileMoneyWithdrawalFeeBracket existing = bracket(1L, 5_001, 15_000, 300);
        when(repository.findFee("MIXX", State.ENABLED, 10_000)).thenReturn(Optional.of(existing));

        assertEquals(300L, service.feeFor("mixx", 10_000).orElseThrow());
    }

    @Test
    void createPersistsNonOverlappingBracket() {
        when(repository.findByNetworkAndStateOrderByMinAmountAsc("FLOOZ", State.ENABLED)).thenReturn(List.of());
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(request("FLOOZ", 0, 5_000, 100));

        ArgumentCaptor<MobileMoneyWithdrawalFeeBracket> captor = ArgumentCaptor.forClass(MobileMoneyWithdrawalFeeBracket.class);
        verify(repository).save(captor.capture());
        assertEquals(100L, captor.getValue().getFeeAmount());
        assertEquals("FLOOZ", captor.getValue().getNetwork());
    }

    private static WithdrawalFeeBracketDto request(String network, long min, long max, long fee) {
        WithdrawalFeeBracketDto dto = new WithdrawalFeeBracketDto();
        dto.setNetwork(network);
        dto.setMinAmount(min);
        dto.setMaxAmount(max);
        dto.setFeeAmount(fee);
        return dto;
    }

    private static MobileMoneyWithdrawalFeeBracket bracket(Long id, long min, long max, long fee) {
        MobileMoneyWithdrawalFeeBracket bracket = new MobileMoneyWithdrawalFeeBracket();
        bracket.setId(id);
        bracket.setNetwork("MIXX");
        bracket.setMinAmount(min);
        bracket.setMaxAmount(max);
        bracket.setFeeAmount(fee);
        bracket.setState(State.ENABLED);
        return bracket;
    }
}
