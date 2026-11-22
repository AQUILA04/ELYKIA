package com.optimize.elykia.sale.application;

import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditPurpose;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.CreditTimeline;
import com.optimize.elykia.sale.domain.Order;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.*;
import com.optimize.elykia.shared.domain.OperationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Façade de délégation rétrocompatible vers les 5 services applicatifs cohésifs du domaine {@code sale}
 * ({@link CashSaleService}, {@link CreditSaleService}, {@link TontineSaleService},
 * {@link SaleCollectorService}, {@link SaleQueryService}).
 */
@Transactional
@Service
public class CreditService extends GenericService<Credit, Long> {

    private final CashSaleService cashSaleService;
    private final CreditSaleService creditSaleService;
    private final TontineSaleService tontineSaleService;
    private final SaleCollectorService saleCollectorService;
    private final SaleQueryService saleQueryService;

    public CreditService(
            CreditRepository repository,
            CashSaleService cashSaleService,
            CreditSaleService creditSaleService,
            TontineSaleService tontineSaleService,
            SaleCollectorService saleCollectorService,
            SaleQueryService saleQueryService) {
        super(repository);
        this.cashSaleService = cashSaleService;
        this.creditSaleService = creditSaleService;
        this.tontineSaleService = tontineSaleService;
        this.saleCollectorService = saleCollectorService;
        this.saleQueryService = saleQueryService;
    }

    @Override
    public CreditRepository getRepository() {
        return (CreditRepository) repository;
    }

    public CreditRespDto createCredit(CreditDto creditDto) {
        return OperationType.CASH.equals(creditDto.getType())
                ? cashSaleService.createCashSale(creditDto)
                : creditSaleService.createCredit(creditDto);
    }

    public CreditRespDto updateCredit(CreditDto creditDto, Long id) {
        return getById(id).isCash()
                ? cashSaleService.updateCashSale(creditDto, id)
                : creditSaleService.updateCredit(creditDto, id);
    }

    public CreditRespDto updateCashSale(CreditDto creditDto, Long id) { return cashSaleService.updateCashSale(creditDto, id); }
    public void settleCashSaleOnDelivery(Long creditId) { cashSaleService.settleCashSaleOnDelivery(creditId); }
    public void cancelPendingCashSale(Long creditId) { cashSaleService.cancelPendingCashSale(creditId); }

    public Long transformOrderToCredit(Order order) { return creditSaleService.transformOrderToCredit(order); }
    public void creditUnicity(Credit credit) { creditSaleService.creditUnicity(credit); }
    public void creditUnicity(Credit credit, CreditPurpose purpose) { creditSaleService.creditUnicity(credit, purpose); }
    public void syncClientCreditFlagsAfterClose(Credit credit) { creditSaleService.syncClientCreditFlagsAfterClose(credit); }
    public Credit creditEnrichment(Credit credit) { return creditSaleService.creditEnrichment(credit); }
    public void creditControlProcess(Credit credit) { creditSaleService.creditControlProcess(credit); }
    public boolean changeDailyStake(ChangeDailyStakeDto dto) { return creditSaleService.changeDailyStake(dto); }
    public List<CreditDailyStakeHistoryDto> getDailyStakeHistory(Long creditId) { return creditSaleService.getDailyStakeHistory(creditId); }
    public CreditRespDto distributeArticlesV2(DistributeArticleDto dto) { return creditSaleService.distributeArticlesV2(dto); }
    public Boolean validateCredit(Long creditId) { return creditSaleService.validateCredit(creditId); }
    public Boolean startCredit(Long creditId, Boolean distribution) { return creditSaleService.startCredit(creditId, distribution); }
    public void updateReleasePrinted(LocalDate releaseDate) { creditSaleService.updateReleasePrinted(releaseDate); }

    @Override
    public boolean deleteSoft(Long id) throws ApplicationException { return creditSaleService.deleteSoft(id); }

    public void createTontineCredit(Credit credit, String clientIdForReference, Runnable beforeSave, Consumer<Credit> afterArticlesSaved) {
        tontineSaleService.createTontineSale(credit, clientIdForReference, beforeSave, afterArticlesSaved);
    }

    public CreditRespDto changeCollector(Long creditId, String newCollector) { return saleCollectorService.changeCollector(creditId, newCollector); }
    public List<CreditCollectorHistoryDto> getCollectorHistory(Long creditId) { return saleCollectorService.getCollectorHistory(creditId); }
    public void bulkChangeCollector(BulkChangeCollectorDto dto) { saleCollectorService.bulkChangeCollector(dto); }

    public String generateReference(String clientId, ClientType clientType) { return SaleReferenceGenerator.generate(clientId, clientType); }

    public Page<CreditRespDto> elasticsearch(String keyword, Pageable pageable) { return saleQueryService.elasticsearch(keyword, pageable); }
    public Page<CreditRespDto> searchCredits(CreditSearchDto dto, Pageable pageable) { return saleQueryService.searchCredits(dto, pageable); }
    public Page<DailyUnrecoveredCreditDto> getCreditByCollector(Pageable pageable) { return saleQueryService.getCreditByCollector(pageable); }
    public List<DailyUnrecoveredCreditDto> getCreditByCollector() { return saleQueryService.getCreditByCollector(); }
    public Map<String, List<DailyUnrecoveredCreditDto>> getCreditByCollectorV2() { return saleQueryService.getCreditByCollectorV2(); }
    public Page<CreditRespDto> getCreditByCollectors(String collector, Pageable pageable) { return saleQueryService.getCreditByCollectors(collector, pageable); }
    public Page<CreditRespDto> getCreditHistoryByCollectors(String collector, Pageable pageable) { return saleQueryService.getCreditHistoryByCollectors(collector, pageable); }
    public Page<CreditRespDto> getAll(Pageable pageable, String searchTerm) { return saleQueryService.getAll(pageable, searchTerm); }
    public Page<Credit> getAllValidatedCredit(String collector, Pageable pageable) { return saleQueryService.getAllValidatedCredit(collector, pageable); }
    public Page<Credit> getCreditHistories(Pageable pageable) { return saleQueryService.getCreditHistories(pageable); }
    public ClientDetails getClientDetails(Long clientId) { return saleQueryService.getClientDetails(clientId); }
    public Page<Credit> getCreditsByClientAndStatus(Long clientId, CreditStatus status, Pageable pageable) { return saleQueryService.getCreditsByClientAndStatus(clientId, status, pageable); }
    public Page<Credit> getCreditsByClientAndStatusIn(Long clientId, List<CreditStatus> statuses, Pageable pageable) { return saleQueryService.getCreditsByClientAndStatusIn(clientId, statuses, pageable); }
    public Page<CreditTimelineRespDto> getTimelines(Long creditId, Pageable pageable) { return saleQueryService.getTimelines(creditId, pageable); }
    public Page<CreditTimeline> getTimelinesByClient(Long clientId, Pageable pageable) { return saleQueryService.getTimelinesByClient(clientId, pageable); }
    public Page<CreditRespDto> getDelayedCreditsByCommercial(String commercial, Pageable pageable) { return saleQueryService.getDelayedCreditsByCommercial(commercial, pageable); }
    public Page<CreditRespDto> getEndingCreditsByCommercial(String commercial, Pageable pageable) { return saleQueryService.getEndingCreditsByCommercial(commercial, pageable); }
    public List<StockOutput> getCommercialStockOutput(String commercialUsername) { return saleQueryService.getCommercialStockOutput(commercialUsername); }
    @Transactional(readOnly = true)
    public Credit getByIdWithSourceStocks(Long id) { return saleQueryService.getByIdWithSourceStocks(id); }
    @Transactional(readOnly = true)
    public Double getClientReliquatAmount(Long creditId) { return saleQueryService.getClientReliquatAmount(creditId); }
}