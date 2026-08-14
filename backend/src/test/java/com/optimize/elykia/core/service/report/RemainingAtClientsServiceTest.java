package com.optimize.elykia.core.service.report;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.report.RemainingAtClientsCreditDto;
import com.optimize.elykia.core.dto.report.RemainingAtClientsPageDto;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RemainingAtClientsServiceTest {

    @Mock
    private CreditRepository creditRepository;

    private RemainingAtClientsService service;

    @BeforeEach
    void setUp() {
        service = new RemainingAtClientsService(creditRepository);
    }

    @Test
    void getPageRejectsBlankCommercial() {
        assertThatThrownBy(() -> service.getPage("  ", 2026, PageRequest.of(0, 25)))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("commercial");
    }

    @Test
    void getPageRejectsInvalidYear() {
        assertThatThrownBy(() -> service.getPage("COM004", 1999, PageRequest.of(0, 25)))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("Année");
    }

    @Test
    void getPageUsesLivePortfolioWithoutBeginDateFilter() {
        Pageable pageable = PageRequest.of(0, 25);
        RemainingAtClientsCreditDto row = new RemainingAtClientsCreditDto(
                1L, "CR-1", "Mensah", "Koffi", LocalDate.of(2025, 3, 10), 50000.0, 20000.0);
        Page<RemainingAtClientsCreditDto> page = new PageImpl<>(List.of(row), pageable, 1);

        when(creditRepository.findLiveRemainingAtClientsCredits(
                eq("COM004"), eq(OperationType.CREDIT), eq(State.ENABLED), eq(pageable)))
                .thenReturn(page);
        when(creditRepository.sumLiveRemainingAtClients(
                eq("COM004"), eq(OperationType.CREDIT), eq(State.ENABLED)))
                .thenReturn(List.<Object[]>of(new Object[]{1L, 20000.0}));

        RemainingAtClientsPageDto result = service.getPage("COM004", 2026, pageable);

        assertThat(result.content().getContent()).hasSize(1);
        assertThat(result.salesCount()).isEqualTo(1L);
        assertThat(result.totalRemainingAmount()).isEqualTo(20000.0);
        verify(creditRepository).findLiveRemainingAtClientsCredits(
                "COM004", OperationType.CREDIT, State.ENABLED, pageable);
    }

    @Test
    void findAllReturnsLiveCreditsForCollector() {
        RemainingAtClientsCreditDto row = new RemainingAtClientsCreditDto(
                2L, "CR-2", "Ama", "Yao", LocalDate.of(2024, 1, 5), 10000.0, 5000.0);
        when(creditRepository.findAllLiveRemainingAtClientsCredits(
                eq("COM004"), eq(OperationType.CREDIT), eq(State.ENABLED)))
                .thenReturn(List.of(row));

        List<RemainingAtClientsCreditDto> result = service.findAll("COM004", 2026);

        assertThat(result).containsExactly(row);
    }
}
