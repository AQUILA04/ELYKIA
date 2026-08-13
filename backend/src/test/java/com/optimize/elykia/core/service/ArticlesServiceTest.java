package com.optimize.elykia.core.service;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.entity.article.ArticleHistory;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import com.optimize.elykia.core.entity.stock.StockReception;
import com.optimize.elykia.core.mapper.ArticlesMapper;
import com.optimize.elykia.core.repository.ArticlePriceHistoryRepository;
import com.optimize.elykia.core.repository.ArticleStateHistoryRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import com.optimize.elykia.core.service.expense.ExpenseService;
import com.optimize.elykia.core.service.store.ArticleHistoryService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.stock.StockValuationFacade;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticlesServiceTest {

    @Mock private ArticlesRepository articlesRepository;
    @Mock private ArticlesMapper articlesMapper;
    @Mock private UserService userService;
    @Mock private ArticleHistoryService articleHistoryService;
    @Mock private ExpenseService expenseService;
    @Mock private ExpenseTypeRepository expenseTypeRepository;
    @Mock private StockReceptionRepository stockReceptionRepository;
    @Mock private ArticleStateHistoryRepository articleStateHistoryRepository;
    @Mock private ArticlePriceHistoryRepository articlePriceHistoryRepository;
    @Mock private StockValuationFacade stockValuationFacade;

    @InjectMocks
    private ArticlesService articlesService;

    private Articles article;
    private User currentUser;

    @BeforeEach
    void setUp() {
        // Mock User instead of using constructor to avoid signature mismatches
        currentUser = mock(User.class);
        lenient().when(currentUser.getUsername()).thenReturn("testuser");
        
        article = new Articles();
        article.setId(1L);
        article.setName("Article 1");
        article.setType("Type");
        article.setMarque("Marque");
        article.setModel("Model");
        article.setPurchasePrice(100.0);
        article.setStockQuantity(10);

        lenient().when(stockValuationFacade.resolveEntryUnitPrice(any(), any())).thenAnswer(invocation -> {
            Articles target = invocation.getArgument(0);
            Double requested = invocation.getArgument(1);
            return requested != null && requested > 0 ? requested : target.getPurchasePrice();
        });
    }

    @Test
    void createArticles_ShouldGenerateCodeBeforePersist() {
        ArticlesDto dto = new ArticlesDto();
        dto.setType("TOMATE");
        dto.setMarque("SUPER8");
        dto.setModel("70G PETIT");
        dto.setName("SUPER 8");
        dto.setPurchasePrice(96.0);
        dto.setSellingPrice(125.0);
        dto.setCreditSalePrice(150.0);

        Articles mapped = new Articles();
        mapped.setType(dto.getType());
        mapped.setMarque(dto.getMarque());
        mapped.setModel(dto.getModel());
        mapped.setName(dto.getName());
        mapped.setPurchasePrice(dto.getPurchasePrice());
        mapped.setSellingPrice(dto.getSellingPrice());
        mapped.setCreditSalePrice(dto.getCreditSalePrice());

        when(articlesMapper.toEntity(dto)).thenReturn(mapped);
        when(articlesRepository.save(any(Articles.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Articles result = articlesService.createArticles(dto);

        assertThat(result.getCode()).isEqualTo("TOMSU70S8150");
        verify(articlesRepository).save(result);
    }

    @Test
    void makeStockEntries_ShouldCreatePendingReception_WithoutStockImpact() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(article));

        StockEntryDto stockEntryDto = new StockEntryDto();
        StockEntry entry = new StockEntry();
        entry.setArticleId(1L);
        entry.setQuantity(5);
        entry.setUnitPrice(120.0);
        stockEntryDto.setArticleEntries(Set.of(entry));

        String result = articlesService.makeStockEntries(stockEntryDto);

        assertThat(result).isEqualTo("success:true");

        verify(articlesRepository, never()).saveAndFlush(any(Articles.class));
        verify(articleHistoryService, never()).create(any(ArticleHistory.class));
        verify(stockValuationFacade, never()).registerEntry(any(), anyInt(), anyDouble(), any(), any(), any());
        verify(expenseService, never()).createExpense(any(ExpenseDto.class));
        verify(stockReceptionRepository, times(1)).save(argThat(reception ->
                reception.getStatus() == com.optimize.elykia.core.enumaration.ReceptionStatus.PENDING));
    }

    @Test
    void makeStockEntries_ShouldNotCreateExpense_WhenQuantityIsZero() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(article));

        StockEntryDto stockEntryDto = new StockEntryDto();
        StockEntry entry = new StockEntry();
        entry.setArticleId(1L);
        entry.setQuantity(0);
        entry.setUnitPrice(100.0);
        stockEntryDto.setArticleEntries(Set.of(entry));

        articlesService.makeStockEntries(stockEntryDto);

        verify(stockReceptionRepository, times(1)).save(any(StockReception.class));
        verify(expenseService, never()).createExpense(any(ExpenseDto.class));
        verify(articleHistoryService, never()).create(any(ArticleHistory.class));
    }

    @Test
    void resetStockForArticle_ShouldResetQuantityAndCreateHistory() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(article));
        // GenericService.update calls saveAndFlush
        when(articlesRepository.saveAndFlush(any(Articles.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Articles result = articlesService.resetStockForArticle(1L);

        assertThat(result.getStockQuantity()).isEqualTo(0);
        verify(articleHistoryService, times(1)).create(any(ArticleHistory.class));
        verify(articlesRepository, times(1)).saveAndFlush(any(Articles.class));
    }
}
