package com.optimize.elykia.core.service.store;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.dto.ArticlesDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.event.ArticlePriceChangedEvent;
import com.optimize.elykia.core.mapper.ArticlesMapper;
import com.optimize.elykia.core.repository.ArticlePriceHistoryRepository;
import com.optimize.elykia.core.repository.ArticleStateHistoryRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.repository.StockReceptionRepository;
import com.optimize.elykia.core.service.expense.ExpenseService;
import com.optimize.elykia.core.service.stock.ArticlePackagingPricingService;
import com.optimize.elykia.core.service.stock.StockValuationFacade;
import com.optimize.elykia.core.util.StockPriceRealignmentParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticlesServicePriceRealignmentTest {

    @Mock
    private ArticlesRepository repository;
    @Mock
    private ArticlesMapper articlesMapper;
    @Mock
    private UserService userService;
    @Mock
    private ArticleHistoryService articleHistoryService;
    @Mock
    private ExpenseService expenseService;
    @Mock
    private ExpenseTypeRepository expenseTypeRepository;
    @Mock
    private StockReceptionRepository stockReceptionRepository;
    @Mock
    private ArticleStateHistoryRepository articleStateHistoryRepository;
    @Mock
    private ArticlePriceHistoryRepository articlePriceHistoryRepository;
    @Mock
    private StockValuationFacade stockValuationFacade;
    @Mock
    private ArticlePackagingPricingService articlePackagingPricingService;
    @Mock
    private ParameterService parameterService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private User currentUser;

    private ArticlesService service;

    @BeforeEach
    void setUp() {
        service = new ArticlesService(
                repository,
                articlesMapper,
                userService,
                articleHistoryService,
                expenseService,
                expenseTypeRepository,
                stockReceptionRepository,
                articleStateHistoryRepository,
                articlePriceHistoryRepository,
                stockValuationFacade,
                articlePackagingPricingService,
                parameterService,
                eventPublisher);
        lenient().doNothing().when(articlePackagingPricingService).validateArticlePackaging(any());
    }

    @Test
    void updateArticles_paramOff_doesNotPublishRealignmentEvent() {
        Articles oldOne = article(10L, 100, 200, 300);
        Articles updated = article(10L, 100, 200, 400);
        ArticlesDto dto = new ArticlesDto();
        when(articlesMapper.toEntity(dto)).thenReturn(updated);
        when(repository.findById(10L)).thenReturn(java.util.Optional.of(oldOne));
        when(parameterService.isEnabled(StockPriceRealignmentParams.ENABLED_KEY)).thenReturn(false);
        when(repository.save(any(Articles.class))).thenAnswer(inv -> inv.getArgument(0));

        service.updateArticles(dto, 10L);

        verify(eventPublisher, never()).publishEvent(any());
        verify(articlePriceHistoryRepository).save(any());
    }

    @Test
    void updateArticles_paramOn_creditSaleChange_publishesCommercialSync() {
        Articles oldOne = article(10L, 100, 200, 300);
        Articles updated = article(10L, 100, 200, 450);
        ArticlesDto dto = new ArticlesDto();
        when(articlesMapper.toEntity(dto)).thenReturn(updated);
        when(repository.findById(10L)).thenReturn(java.util.Optional.of(oldOne));
        when(parameterService.isEnabled(StockPriceRealignmentParams.ENABLED_KEY)).thenReturn(true);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gest.prix");
        when(repository.save(any(Articles.class))).thenAnswer(inv -> inv.getArgument(0));

        service.updateArticles(dto, 10L);

        ArgumentCaptor<ArticlePriceChangedEvent> captor = ArgumentCaptor.forClass(ArticlePriceChangedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        ArticlePriceChangedEvent event = captor.getValue();
        assertEquals(10L, event.getArticleId());
        assertTrue(event.isCommercialSync());
        assertFalse(event.isTontineSync());
        assertEquals(300.0, event.getOldCreditSalePrice());
        assertEquals(450.0, event.getNewCreditSalePrice());
        assertEquals("gest.prix", event.getActingUsername());
    }

    @Test
    void updateArticles_paramOn_sellingChange_publishesTontineSync() {
        Articles oldOne = article(11L, 100, 200, 300);
        Articles updated = article(11L, 100, 250, 300);
        ArticlesDto dto = new ArticlesDto();
        when(articlesMapper.toEntity(dto)).thenReturn(updated);
        when(repository.findById(11L)).thenReturn(java.util.Optional.of(oldOne));
        when(parameterService.isEnabled(StockPriceRealignmentParams.ENABLED_KEY)).thenReturn(true);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn("gest.prix");
        when(repository.save(any(Articles.class))).thenAnswer(inv -> inv.getArgument(0));

        service.updateArticles(dto, 11L);

        ArgumentCaptor<ArticlePriceChangedEvent> captor = ArgumentCaptor.forClass(ArticlePriceChangedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        ArticlePriceChangedEvent event = captor.getValue();
        assertTrue(event.isTontineSync());
        assertFalse(event.isCommercialSync());
        assertEquals(200.0, event.getOldSellingPrice());
        assertEquals(250.0, event.getNewSellingPrice());
    }

    private static Articles article(Long id, double purchase, double selling, double credit) {
        Articles a = new Articles();
        a.setId(id);
        a.setPurchasePrice(purchase);
        a.setSellingPrice(selling);
        a.setCreditSalePrice(credit);
        a.setStockQuantity(5);
        return a;
    }
}
