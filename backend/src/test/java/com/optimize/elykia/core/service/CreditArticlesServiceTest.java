package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.CreditArticleDetailDto;
import com.optimize.elykia.core.dto.SoldArticleDto;
import com.optimize.elykia.core.dto.SoldArticleSearchDto;
import com.optimize.elykia.core.dto.SoldArticlesSearchResultDto;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.service.sale.CreditArticlesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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

    @Test
    void searchSoldArticles_exposesLinePricesAndTheFilteredTotal() {
        SoldArticleDto row = new SoldArticleDto(1L, "RIZ: RIZIERE 5 KG", 4L, "COM019", 8000d);
        when(creditArticlesRepository.findSoldArticles(any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(0, 10), 16));
        when(creditArticlesRepository.sumSoldArticlesAmount(any(), any(), eq("COM019"))).thenReturn(125000d);

        SoldArticleSearchDto search = new SoldArticleSearchDto();
        search.setStartDate(LocalDate.of(2026, 10, 12));
        search.setEndDate(LocalDate.of(2026, 10, 18));
        search.setCommercial("COM019");

        SoldArticlesSearchResultDto result = creditArticlesService.searchSoldArticles(search, PageRequest.of(0, 10));

        assertEquals(16, result.getTotalElements());
        assertEquals(125000d, result.getTotalAmount());
        assertEquals(8000d, result.getContent().get(0).getTotalAmount());
        assertEquals(2000d, result.getContent().get(0).getUnitPrice());
        verify(creditArticlesRepository).sumSoldArticlesAmount(
                LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 18), "COM019");
    }

    @Test
    void soldArticleUnitPrice_isZeroWhenQuantityIsZero() {
        SoldArticleDto row = new SoldArticleDto(1L, "RIZ", 0L, "COM019", 0d);

        assertEquals(0d, row.getUnitPrice());
        assertEquals(0d, row.getTotalAmount());
    }
}
