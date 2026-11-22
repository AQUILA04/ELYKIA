package com.optimize.elykia.sale.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.finance.application.DailyAccountancyService;
import com.optimize.elykia.sale.domain.ClientReliquat;
import com.optimize.elykia.sale.domain.CommercialMonthlyStock;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockItem;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.SolvencyStatus;
import com.optimize.elykia.sale.infrastructure.persistence.ClientReliquatRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditArticlesRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRecoveryQueryRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditTimelineRepository;
import com.optimize.elykia.sale.infrastructure.persistence.SaleSearchQueryRepository;
import com.optimize.elykia.sale.web.dto.ClientDetails;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import com.optimize.elykia.sale.web.dto.CreditSearchDto;
import com.optimize.elykia.sale.web.dto.DailyUnrecoveredCreditDto;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SaleQueryServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CreditRecoveryQueryRepository creditRecoveryQueryRepository;
    @Mock private SaleSearchQueryRepository saleSearchQueryRepository;
    @Mock private CreditTimelineRepository creditTimelineRepository;
    @Mock private CreditArticlesService creditArticlesService;
    @Mock private CreditArticlesRepository creditArticlesRepository;
    @Mock private ClientService clientService;
    @Mock private UserService userService;
    @Mock private DailyAccountancyService dailyAccountancyService;
    @Mock private ClientReliquatRepository clientReliquatRepository;
    @Mock private CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;

    private SaleQueryService service;

    @BeforeEach
    void setUp() {
        service = new SaleQueryService(
                creditRepository,
                creditRecoveryQueryRepository,
                saleSearchQueryRepository,
                creditTimelineRepository,
                creditArticlesService,
                clientService,
                userService,
                dailyAccountancyService,
                clientReliquatRepository,
                commercialMonthlyStockItemRepository);
    }

    @Test
    void searchCreditsAndElasticsearchDelegateToSaleSearchQueryRepository() {
        Pageable pageable = PageRequest.of(0, 10);
        Credit c = new Credit(1L);
        when(saleSearchQueryRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(c)));
        when(saleSearchQueryRepository.elasticsearch("abc", pageable))
                .thenReturn(new PageImpl<>(List.of(c)));

        assertEquals(1, service.searchCredits(new CreditSearchDto(null, null, null, null, null, null, null, null), pageable).getTotalElements());
        assertEquals(1, service.elasticsearch("abc", pageable).getTotalElements());
    }

    @Test
    void getCreditByCollectorV2_requiresOpenCashDeskAndGroupsByQuarter() {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn("COM001");
        when(userService.getCurrentUser()).thenReturn(user);
        when(dailyAccountancyService.isOpenCashDesk()).thenReturn(false);

        assertThrows(ApplicationException.class, () -> service.getCreditByCollector());

        when(dailyAccountancyService.isOpenCashDesk()).thenReturn(true);
        DailyUnrecoveredCreditDto row = new DailyUnrecoveredCreditDto(
                1L, "CR-1", 500.0, 2_000.0, 10L, "Afi", "Koffi", "Tokoin", "Commerçante");
        when(creditRecoveryQueryRepository.findUnrecoveredCreditsForDay(
                eq(CreditStatus.INPROGRESS), eq("COM001"), eq(ClientType.CLIENT), any(), any()))
                .thenReturn(List.of(row));
        when(clientReliquatRepository.findByClientIdIn(any())).thenReturn(List.of());

        Map<String, List<DailyUnrecoveredCreditDto>> grouped = service.getCreditByCollectorV2();
        assertEquals(1, grouped.get("Tokoin").size());
    }

    @Test
    void getAll_filtersByPromoterUsernameAndSearchTerm() {
        User promoter = mock(User.class);
        when(promoter.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(promoter.getUsername()).thenReturn("COM003");
        when(userService.getCurrentUser()).thenReturn(promoter);
        Pageable pageable = PageRequest.of(0, 20);
        when(saleSearchQueryRepository.findCreditsDtoWithSearch(
                "CR-9", "COM003", null, OperationType.CREDIT, State.ENABLED, pageable))
                .thenReturn(Page.empty());
        when(saleSearchQueryRepository.findCreditsDto(
                "COM003", null, OperationType.CREDIT, State.ENABLED, pageable))
                .thenReturn(Page.empty());

        service.getAll(pageable, "CR-9");
        service.getAll(pageable, "  ");

        verify(saleSearchQueryRepository).findCreditsDtoWithSearch(
                "CR-9", "COM003", null, OperationType.CREDIT, State.ENABLED, pageable);
        verify(saleSearchQueryRepository).findCreditsDto(
                "COM003", null, OperationType.CREDIT, State.ENABLED, pageable);
    }

    @Test
    void getCreditByCollectors_batchesArticlesForReturnedCredits() {
        CreditRespDto dto = CreditRespDto.fromId(5L);
        when(saleSearchQueryRepository.findCreditsDto(
                eq("COM001"), eq(CreditStatus.INPROGRESS), eq(OperationType.CREDIT), eq(State.ENABLED), any()))
                .thenReturn(new PageImpl<>(List.of(dto)));
        CreditArticles line = new CreditArticles();
        line.setCredit(new Credit(5L));
        when(creditArticlesService.getRepository()).thenReturn(creditArticlesRepository);
        when(creditArticlesRepository.findByCreditIds(List.of(5L))).thenReturn(Set.of(line));

        Page<CreditRespDto> result = service.getCreditByCollectors("COM001", PageRequest.of(0, 10));
        assertEquals(1, result.getContent().get(0).articles().size());
    }

    @Test
    void getClientDetails_aggregatesCoreAndRecoveryMetrics() {
        Client client = new Client();
        client.setId(4L);
        client.setFirstname("Yao");
        client.setLastname("Mensah");
        Account account = new Account();
        account.setAccountNumber("ACC-4");
        client.setAccount(account);
        client.setCollector("COM001");

        when(clientService.getById(4L)).thenReturn(client);
        when(creditRepository.countCreditsByClientId(4L, CreditStatus.INPROGRESS)).thenReturn(1);
        when(creditRepository.countByStatusAndClient_id(CreditStatus.SETTLED, 4L)).thenReturn(3);
        when(creditRepository.countByStatusAndClient_idAndSolvencyNote(CreditStatus.INPROGRESS, 4L, SolvencyStatus.LATE))
                .thenReturn(0);
        when(creditRepository.getTotalInProgressAmountByClientId(4L, CreditStatus.INPROGRESS)).thenReturn(20_000.0);
        when(creditRepository.getTotalInProgressAmountPaidByClientId(4L, CreditStatus.INPROGRESS)).thenReturn(8_000.0);
        when(creditRecoveryQueryRepository.getTotalAmountDueTodayByClientId(4L)).thenReturn(1_000.0);

        ClientDetails details = service.getClientDetails(4L);
        assertEquals("ACC-4", details.getAccountNumber());
        assertEquals(12_000.0, details.getTotalAmountRemaining());
        assertEquals(1_000.0, details.getTotalInProgressAmountDue());
    }

    @Test
    void getByIdWithSourceStocksAndClientReliquatEnrichesTransientFields() {
        Client client = new Client();
        client.setId(9L);
        CreditArticles line = new CreditArticles();
        line.setStockItemId(50L);
        Credit credit = new Credit(7L);
        credit.setClient(client);
        credit.setArticles(Set.of(line));

        CommercialMonthlyStock stock = new CommercialMonthlyStock();
        stock.setId(100L);
        stock.setCollector("COM001");
        stock.setMonth(11);
        stock.setYear(2026);
        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setId(50L);
        item.setMonthlyStock(stock);

        ClientReliquat reliquat = new ClientReliquat();
        reliquat.setTotalAmount(750.0);

        when(creditRepository.findById(7L)).thenReturn(Optional.of(credit));
        when(commercialMonthlyStockItemRepository.findAllByIdInWithMonthlyStock(Set.of(50L)))
                .thenReturn(List.of(item));
        when(clientReliquatRepository.findByClientId(9L)).thenReturn(Optional.of(reliquat));

        Credit loaded = service.getByIdWithSourceStocks(7L);
        assertEquals(1, loaded.getSourceMonthlyStocks().size());
        assertEquals(750.0, loaded.getClientReliquatAmount());
        assertEquals(750.0, service.getClientReliquatAmount(7L));
    }
}
