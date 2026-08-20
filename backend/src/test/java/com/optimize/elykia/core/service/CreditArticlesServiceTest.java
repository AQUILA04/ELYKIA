package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.CreditArticleDetailDto;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.service.sale.CreditArticlesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditArticlesServiceTest {

    @Mock
    private CreditArticlesRepository creditArticlesRepository;
    @InjectMocks
    private CreditArticlesService creditArticlesService;

    @Test
    void delete_removesTheExactCreditArticleAssociation() {
        // Given
        CreditArticles association = new CreditArticles();

        // When
        creditArticlesService.delete(association);

        // Then
        verify(creditArticlesRepository).delete(association);
    }

    @Test
    void getTop10ArticlesWithHighestQuantity_requestsFirstPageLimitedToTen() {
        // Given
        List<Object[]> expected = List.<Object[]>of(new Object[] {"Article A", 25L});
        when(creditArticlesRepository.findTop10ArticlesWithHighestQuantity(org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(expected);

        // When
        List<Object[]> result = creditArticlesService.getTop10ArticlesWithHighestQuantity();

        // Then
        assertSame(expected, result);
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(creditArticlesRepository).findTop10ArticlesWithHighestQuantity(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(0, captor.getValue().getPageNumber());
        org.junit.jupiter.api.Assertions.assertEquals(10, captor.getValue().getPageSize());
    }

    @Test
    void getDetailsByStockItemId_returnsRepositoryDetailsForStockLine() {
        // Given
        List<CreditArticleDetailDto> expected = List.of();
        when(creditArticlesRepository.findDetailsByStockItemId(12L)).thenReturn(expected);

        // When
        List<CreditArticleDetailDto> result = creditArticlesService.getDetailsByStockItemId(12L);

        // Then
        assertSame(expected, result);
        verify(creditArticlesRepository).findDetailsByStockItemId(12L);
    }

    @Test
    void getDetailsByTontineItemId_returnsRepositoryDetailsForTontineLine() {
        // Given
        List<CreditArticleDetailDto> expected = List.of();
        when(creditArticlesRepository.findDetailsByTontineItemId(24L)).thenReturn(expected);

        // When
        List<CreditArticleDetailDto> result = creditArticlesService.getDetailsByTontineItemId(24L);

        // Then
        assertSame(expected, result);
        verify(creditArticlesRepository).findDetailsByTontineItemId(24L);
    }
}
