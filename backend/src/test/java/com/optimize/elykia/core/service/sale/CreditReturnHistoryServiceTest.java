package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.core.entity.sale.CreditReturnHistory;
import com.optimize.elykia.core.repository.CreditReturnHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditReturnHistoryServiceTest {

    @Mock
    private CreditReturnHistoryRepository creditReturnHistoryRepository;
    @InjectMocks
    private CreditReturnHistoryService service;

    @Test
    void getHistoryByCreditId_returnsRepositoryHistoryForRequestedCredit() {
        // Given
        List<CreditReturnHistory> expectedHistory = List.of(new CreditReturnHistory());
        when(creditReturnHistoryRepository.findByCreditId(10L)).thenReturn(expectedHistory);

        // When
        List<CreditReturnHistory> result = service.getHistoryByCreditId(10L);

        // Then
        assertSame(expectedHistory, result);
        verify(creditReturnHistoryRepository).findByCreditId(10L);
    }

    @Test
    void getHistoryByArticleId_returnsRepositoryHistoryForRequestedArticle() {
        // Given
        List<CreditReturnHistory> expectedHistory = List.of(new CreditReturnHistory());
        when(creditReturnHistoryRepository.findByArticleId(20L)).thenReturn(expectedHistory);

        // When
        List<CreditReturnHistory> result = service.getHistoryByArticleId(20L);

        // Then
        assertSame(expectedHistory, result);
        verify(creditReturnHistoryRepository).findByArticleId(20L);
    }
}
