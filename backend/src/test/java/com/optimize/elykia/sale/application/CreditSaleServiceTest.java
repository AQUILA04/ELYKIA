package com.optimize.elykia.sale.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.inventory.application.ArticlesService;
import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.sale.api.AdhesionCreditPort;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditDailyStakeHistory;
import com.optimize.elykia.sale.domain.CreditPurpose;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditDailyStakeHistoryRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.ChangeDailyStakeDto;
import com.optimize.elykia.sale.web.dto.CreditDto;
import com.optimize.elykia.sale.web.mapper.CreditMapper;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.shared.monitoring.BusinessMetricsPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditSaleServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CreditMapper creditMapper;
    @Mock private ClientService clientService;
    @Mock private ArticlesService articlesService;
    @Mock private CreditArticlesService creditArticlesService;
    @Mock private CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    @Mock private CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;
    @Mock private CreditDailyStakeHistoryRepository creditDailyStakeHistoryRepository;
    @Mock private CreditEnrichmentService creditEnrichmentService;
    @Mock private CommercialStockMovementService commercialStockMovementService;
    @Mock private SalePostStartPublisher postStartPublisher;
    @Mock private CommercialMonthlyStockItemSoldValueHistoryService soldValueHistoryService;
    @Mock private AdhesionCreditPort adhesionService;
    @Mock private BusinessMetricsPublisher metricsPublisher;

    private CreditSaleService service;

    @BeforeEach
    void setUp() {
        service = new CreditSaleService(
                creditRepository,
                creditMapper,
                clientService,
                articlesService,
                creditArticlesService,
                commercialMonthlyStockRepository,
                commercialMonthlyStockItemRepository,
                creditDailyStakeHistoryRepository,
                creditEnrichmentService,
                commercialStockMovementService,
                postStartPublisher,
                Optional.of(soldValueHistoryService),
                Optional.of(adhesionService),
                Optional.of(metricsPublisher));
    }

    @Test
    void creditUnicity_rejectsDuplicateGlobalAndPerPurposeCredits() {
        Client client = sampleClient(1L);
        Credit credit = Credit.newCredit(client, Set.of(), 0.0, CreditPurpose.PERSONAL);

        when(creditRepository.hasCreditInProgress(1L)).thenReturn(true);
        assertThrows(CustomValidationException.class, () -> service.creditUnicity(credit));
        verify(metricsPublisher).creditCreationFailed("DUPLICATE_IN_PROGRESS");

        when(creditRepository.hasCreditInProgressForPurpose(1L, CreditPurpose.BUSINESS)).thenReturn(true);
        assertThrows(CustomValidationException.class, () -> service.creditUnicity(credit, CreditPurpose.BUSINESS));
    }

    @Test
    void syncClientCreditFlagsAfterClose_updatesMatchingPurposeFlagOnlyWhenNoRemainingInProgress() {
        Client client = sampleClient(2L);

        Credit business = Credit.newCredit(client, Set.of(), 0.0, CreditPurpose.BUSINESS);
        when(creditRepository.hasCreditInProgressForPurpose(2L, CreditPurpose.BUSINESS)).thenReturn(false);
        service.syncClientCreditFlagsAfterClose(business);
        verify(clientService).updateBusinessCreditInProgress(2L, Boolean.FALSE);

        Credit event = Credit.newCredit(client, Set.of(), 0.0, CreditPurpose.EVENT);
        when(creditRepository.hasCreditInProgressForPurpose(2L, CreditPurpose.EVENT)).thenReturn(false);
        service.syncClientCreditFlagsAfterClose(event);
        verify(clientService).updateEventCreditInProgress(2L, Boolean.FALSE);

        Credit personal = Credit.newCredit(client, Set.of(), 0.0, CreditPurpose.PERSONAL);
        when(creditRepository.hasCreditInProgressForPurpose(2L, CreditPurpose.PERSONAL)).thenReturn(false);
        service.syncClientCreditFlagsAfterClose(personal);
        verify(clientService).updateCreditStatus(2L, Boolean.FALSE);
    }

    @Test
    void changeDailyStake_recordsHistoryAndRejectsCashSaleViaPolicy() {
        Credit credit = Credit.newCredit(sampleClient(3L), Set.of(), 0.0, CreditPurpose.PERSONAL);
        credit.setId(10L);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setBeginDate(LocalDate.now());
        credit.setTotalAmount(10_000.0);
        credit.setTotalAmountRemaining(6_000.0);
        credit.setDailyStake(350.0);
        when(creditRepository.findById(10L)).thenReturn(Optional.of(credit));

        assertTrue(service.changeDailyStake(new ChangeDailyStakeDto(10L, 500.0)));
        assertEquals(500.0, credit.getDailyStake());
        verify(creditDailyStakeHistoryRepository).save(any(CreditDailyStakeHistory.class));
        verify(creditRepository).saveAndFlush(credit);
        verify(metricsPublisher).creditDailyStakeChanged(10L);

        Credit cash = new Credit();
        cash.setId(11L);
        cash.setType(OperationType.CASH);
        when(creditRepository.findById(11L)).thenReturn(Optional.of(cash));
        assertThrows(CustomValidationException.class,
                () -> service.changeDailyStake(new ChangeDailyStakeDto(11L, 500.0)));
    }

    @Test
    void validateAndStartCredit_releasesWarehouseStockAndPublishesPostStart() {
        Articles article = new Articles(5L);
        article.setStockQuantity(10);
        article.setName("Sucre");
        CreditArticles line = new CreditArticles();
        line.setArticles(article);
        line.setQuantity(2);

        Credit credit = Credit.newCredit(sampleClient(4L), Set.of(line), 0.0, CreditPurpose.PERSONAL);
        credit.setId(20L);
        credit.setTotalAmount(6_000.0);
        when(creditRepository.findById(20L)).thenReturn(Optional.of(credit));

        assertTrue(service.validateCredit(20L));
        assertEquals(CreditStatus.VALIDATED, credit.getStatus());

        assertTrue(service.startCredit(20L, Boolean.FALSE));
        assertEquals(CreditStatus.INPROGRESS, credit.getStatus());
        verify(articlesService).makeStockRelease(5L, 2, 20L);
        verify(postStartPublisher).publishAfterStart(credit);
    }

    @Test
    void startCredit_rejectsCashSaleAndUnvalidatedCredit() {
        Credit cash = new Credit();
        cash.setId(21L);
        cash.setType(OperationType.CASH);
        when(creditRepository.findById(21L)).thenReturn(Optional.of(cash));
        assertThrows(CustomValidationException.class, () -> service.startCredit(21L, Boolean.FALSE));

        Credit unvalidated = Credit.newCredit(sampleClient(4L), Set.of(), 0.0, CreditPurpose.PERSONAL);
        unvalidated.setId(22L);
        when(creditRepository.findById(22L)).thenReturn(Optional.of(unvalidated));
        assertThrows(ApplicationException.class, () -> service.startCredit(22L, Boolean.TRUE));
        verify(postStartPublisher, never()).publishAfterStart(any());
    }

    @Test
    void deleteSoft_marksCreditDeletedAndSyncsClientFlags_rejectsCash() {
        Credit credit = Credit.newCredit(sampleClient(5L), Set.of(), 0.0, CreditPurpose.PERSONAL);
        credit.setId(30L);
        when(creditRepository.findById(30L)).thenReturn(Optional.of(credit));
        when(creditRepository.hasCreditInProgressForPurpose(5L, CreditPurpose.PERSONAL)).thenReturn(false);

        assertTrue(service.deleteSoft(30L));
        assertEquals(State.DELETED, credit.getState());
        verify(clientService).updateCreditStatus(5L, Boolean.FALSE);

        Credit cash = new Credit();
        cash.setId(31L);
        cash.setType(OperationType.CASH);
        when(creditRepository.findById(31L)).thenReturn(Optional.of(cash));
        assertThrows(CustomValidationException.class, () -> service.deleteSoft(31L));
    }

    @Test
    void updateCredit_rejectsInProgressCredit() {
        Credit existing = Credit.newCredit(sampleClient(6L), Set.of(), 0.0, CreditPurpose.PERSONAL);
        existing.setId(40L);
        existing.setStatus(CreditStatus.INPROGRESS);
        CreditDto dto = new CreditDto();
        when(creditRepository.findById(40L)).thenReturn(Optional.of(existing));
        when(creditMapper.toEntity(dto)).thenReturn(new Credit());

        assertThrows(CustomValidationException.class, () -> service.updateCredit(dto, 40L));
    }

    private static Client sampleClient(Long id) {
        Client client = new Client();
        client.setId(id);
        client.setFirstname("Kossi");
        client.setLastname("Agbo");
        client.setClientType(ClientType.CLIENT);
        client.setCollector("COM001");
        return client;
    }
}
