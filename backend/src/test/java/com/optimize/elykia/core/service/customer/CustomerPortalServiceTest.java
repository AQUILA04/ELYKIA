package com.optimize.elykia.core.service.customer;

import com.optimize.elykia.core.dto.customer.CustomerArticleDto;
import com.optimize.elykia.core.dto.customer.CustomerArticleTypeDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.customer.CustomerMobileMoneySubmissionRepository;
import com.optimize.elykia.core.service.order.OrderService;
import com.optimize.elykia.core.service.store.ArticlesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerPortalServiceTest {

    @Mock private CustomerContextService contextService;
    @Mock private CreditRepository creditRepository;
    @Mock private CreditTimelineRepository creditTimelineRepository;
    @Mock private CustomerMobileMoneySubmissionRepository submissionRepository;
    @Mock private ArticlesService articlesService;
    @Mock private OrderService orderService;
    @Mock private CreditArticlesRepository creditArticlesRepository;
    @Mock private TontineMemberRepository tontineMemberRepository;
    @Mock private TontineCollectionRepository tontineCollectionRepository;
    @Mock private CommercialMobileMoneyConfigService commercialMobileMoneyConfigService;

    @Test
    void getTopArticleTypes_capsRequestedLimitAndNormalizesNullSoldQuantity() {
        // Given
        CustomerPortalService service = service();
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        when(creditArticlesRepository.findTopArticleTypesBySoldQuantity(pageableCaptor.capture()))
                .thenReturn(List.<Object[]>of(
                        new Object[] {"TV", 12L},
                        new Object[] {"Téléphone", null}));

        // When
        List<CustomerArticleTypeDto> types = service.getTopArticleTypes(99);

        // Then
        assertEquals(20, pageableCaptor.getValue().getPageSize());
        assertEquals(2, types.size());
        assertEquals("TV", types.get(0).getType());
        assertEquals("TV", types.get(0).getLabel());
        assertEquals(12L, types.get(0).getTotalQuantitySold());
        assertEquals("Téléphone", types.get(1).getType());
        assertEquals(0L, types.get(1).getTotalQuantitySold());
    }

    @Test
    void getArticles_filtersCategoryAndExposesAvailabilityAndCommercialIdentity() {
        // Given
        CustomerPortalService service = service();
        Articles television = article(1L, "TV", "Elykia TV", "32 pouces", 5);
        Articles phone = article(2L, "PHONE", "Elykia Phone", "A1", 0);
        when(articlesService.getAllEnabled(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(television, phone)));

        // When
        List<CustomerArticleDto> articles = service.getArticles(null, "tv");

        // Then
        assertEquals(1, articles.size());
        CustomerArticleDto dto = articles.get(0);
        assertEquals("1", dto.getId());
        assertEquals("TV", dto.getCategory());
        assertEquals("TV: Elykia Model", dto.getCommercialName());
        assertEquals("TV: Elykia Model 32 pouces", dto.getDisplayName());
        assertEquals(true, dto.isAvailable());
        verify(articlesService).getAllEnabled(any(Pageable.class));
    }

    private CustomerPortalService service() {
        return new CustomerPortalService(
                contextService,
                creditRepository,
                creditTimelineRepository,
                submissionRepository,
                articlesService,
                orderService,
                creditArticlesRepository,
                tontineMemberRepository,
                tontineCollectionRepository,
                commercialMobileMoneyConfigService);
    }

    private Articles article(Long id, String type, String commercialName, String name, int stock) {
        Articles article = new Articles();
        article.setId(id);
        article.setType(type);
        article.setMarque("Elykia");
        article.setModel("Model");
        article.setName(name);
        article.setStockQuantity(stock);
        article.setCreditSalePrice(1_000.0);
        return article;
    }
}
