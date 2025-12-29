package com.optimize.elykia.core.service;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.StockEntryDto;
import com.optimize.elykia.core.entity.ArticleHistory;
import com.optimize.elykia.core.entity.Articles;
import com.optimize.elykia.core.entity.ExpenseType;
import com.optimize.elykia.core.mapper.ArticlesMapper;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticlesServiceTest {

    @Mock private ArticlesRepository articlesRepository;
    @Mock private ArticlesMapper articlesMapper;
    @Mock private UserService userService;
    @Mock private ArticleHistoryService articleHistoryService;
    @Mock private ExpenseService expenseService;
    @Mock private ExpenseTypeRepository expenseTypeRepository;

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
    }

    @Test
    void makeStockEntries_ShouldCreateExpense_WhenTotalAmountIsPositive() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(article));
        
        ExpenseType expenseType = new ExpenseType();
        expenseType.setId(1L);
        expenseType.setName("Approvisionnement");
        when(expenseTypeRepository.findByName("Approvisionnement")).thenReturn(Optional.of(expenseType));

        StockEntryDto stockEntryDto = new StockEntryDto();
        StockEntry entry = new StockEntry();
        entry.setArticleId(1L);
        entry.setQuantity(5);
        entry.setUnitPrice(120.0);
        stockEntryDto.setArticleEntries(Set.of(entry));

        String result = articlesService.makeStockEntries(stockEntryDto);

        assertThat(result).isEqualTo("success:true");
        
        // Verify Article update
        verify(articlesRepository, atLeastOnce()).saveAndFlush(any(Articles.class)); // GenericService.update calls saveAndFlush
        
        // Verify History creation
        verify(articleHistoryService, times(1)).create(any(ArticleHistory.class));
        
        // Verify Expense creation logic
        verify(expenseService, times(1)).createExpense(any(ExpenseDto.class));
    }
    
    @Test
    void makeStockEntries_ShouldNotCreateExpense_WhenQuantityIsZero() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(article));

        StockEntryDto stockEntryDto = new StockEntryDto();
        StockEntry entry = new StockEntry();
        entry.setArticleId(1L);
        entry.setQuantity(0); // 0 quantity implies 0 cost
        entry.setUnitPrice(100.0);
        stockEntryDto.setArticleEntries(Set.of(entry));

        String result = articlesService.makeStockEntries(stockEntryDto);
        
        // With 0 quantity, total cost is 0. Condition if (totalCheck.get() > 0) should fail.
        verify(expenseService, never()).createExpense(any(ExpenseDto.class));
    }
}
