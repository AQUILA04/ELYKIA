package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.SaleCancellationExecuteDto;
import com.optimize.elykia.core.dto.SaleCancellationFilterDto;
import com.optimize.elykia.core.dto.SaleCancellationPreviewDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.sale.SaleCancellationRun;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.SaleCancellationRunStatus;
import com.optimize.elykia.core.repository.*;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.service.stock.CommercialStockMovementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SaleCancellationServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CreditTimelineRepository creditTimelineRepository;
    @Mock private CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    @Mock private CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;
    @Mock private CommercialStockMovementService commercialStockMovementService;
    @Mock private DailyCommercialReportRepository dailyCommercialReportRepository;
    @Mock private DailyCommercialReportPersistence reportPersistence;
    @Mock private DailyOperationService dailyOperationService;
    @Mock private ClientService clientService;
    @Mock private UserService userService;
    @Mock private SaleCancellationRunRepository runRepository;
    @Mock private SaleCancellationFileRepository fileRepository;
    @Mock private SaleCancellationPdfService pdfService;
    @Mock private SaleCancellationStorageService storageService;

    private SaleCancellationService service;

    @BeforeEach
    void setUp() {
        service = new SaleCancellationService(
                creditRepository,
                creditTimelineRepository,
                commercialMonthlyStockRepository,
                commercialMonthlyStockItemRepository,
                commercialStockMovementService,
                dailyCommercialReportRepository,
                reportPersistence,
                dailyOperationService,
                clientService,
                userService,
                runRepository,
                fileRepository,
                pdfService,
                storageService,
                new ObjectMapper());
    }

    @Test
    void previewExcludesSaleWithEnabledTimeline() {
        Credit recovered = credit(1L, CreditStatus.INPROGRESS, 10_000, 1_000, 1_000);
        Credit eligible = credit(2L, CreditStatus.INPROGRESS, 20_000, 2_000, 2_000);
        when(creditRepository.findSalesForCancellation(
                eq("com.a"), any(), any(), eq(OperationType.CREDIT),
                eq(SaleCancellationService.CANCELLABLE_STATUSES), eq(State.ENABLED)))
                .thenReturn(List.of(recovered, eligible));
        when(creditTimelineRepository.existsByCredit_IdAndState(1L, State.ENABLED)).thenReturn(true);
        when(creditTimelineRepository.existsByCredit_IdAndState(2L, State.ENABLED)).thenReturn(false);

        SaleCancellationPreviewDto preview = service.previewCancellation(filter());

        assertEquals(1, preview.getEligibleCount());
        assertEquals(1, preview.getExcludedCount());
        assertEquals(2L, preview.getEligibleSales().get(0).getCreditId());
        assertEquals(1L, preview.getExcludedSales().get(0).getCreditId());
    }

    @Test
    void previewRejectsNonCancellableStatusFilter() {
        SaleCancellationFilterDto dto = filter();
        dto.setCreditStatus(CreditStatus.SETTLED);
        assertThrows(CustomValidationException.class, () -> service.previewCancellation(dto));
    }

    @Test
    void executeDoesNotCancelRecoveredSaleAndRestoresStockForEligible() {
        LocalDate today = LocalDate.now();
        Credit recovered = credit(1L, CreditStatus.INPROGRESS, 10_000, 1_000, 5_000);
        Credit eligible = credit(2L, CreditStatus.INPROGRESS, 20_000, 2_000, 2_000);
        attachArticle(eligible, 50L, 2, 10_000);

        when(creditRepository.findSalesForCancellationForUpdate(
                eq("com.a"), any(), any(), eq(OperationType.CREDIT),
                eq(SaleCancellationService.CANCELLABLE_STATUSES), eq(State.ENABLED)))
                .thenReturn(List.of(recovered, eligible));
        when(creditTimelineRepository.existsByCredit_IdAndState(2L, State.ENABLED)).thenReturn(false);
        when(userService.getCurrentUser()).thenReturn(null);
        when(runRepository.save(any(SaleCancellationRun.class))).thenAnswer(inv -> {
            SaleCancellationRun run = inv.getArgument(0);
            if (run.getId() == null) {
                run.setId(99L);
            }
            return run;
        });
        when(pdfService.generateSaleAuditPdf(any(), any(), any())).thenReturn(new byte[]{1});
        when(pdfService.generateSummaryReportPdf(any(), any(), any())).thenReturn(new byte[]{2});
        when(storageService.storeFile(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(null);

        CommercialMonthlyStockItem stockItem = stockItem(50L, 2, 20_000, 8_000);
        CommercialMonthlyStock monthlyStock = new CommercialMonthlyStock();
        monthlyStock.setCollector("com.a");
        monthlyStock.setItems(new HashSet<>(Set.of(stockItem)));
        when(commercialMonthlyStockRepository.findByCollectorAndMonthAndYear(
                eq("com.a"), anyInt(), anyInt())).thenReturn(Optional.of(monthlyStock));

        DailyCommercialReport report = new DailyCommercialReport();
        report.setCreditSalesCount(3);
        report.setCreditSalesAmount(50_000.0);
        report.setCreditSalesMargin(10_000.0);
        report.setTotalAdvancesAmount(5_000.0);
        report.setTotalAmountToDeposit(5_000.0);
        when(dailyCommercialReportRepository.findByDateAndCommercialUsername(today, "com.a"))
                .thenReturn(Optional.of(report));

        var result = service.executeCancellation(executeDto(List.of(1L, 2L)));

        assertEquals(SaleCancellationRunStatus.COMPLETED, result.getStatus());
        assertEquals(1, result.getCancelledSalesCount());
        assertEquals(1, result.getExcludedSalesCount());
        assertEquals(2, result.getPdfFileCount());
        assertEquals(CreditStatus.CANCELLED, eligible.getStatus());
        assertEquals(State.DELETED, eligible.getState());
        assertEquals(CreditStatus.INPROGRESS, recovered.getStatus());
        assertEquals(0, stockItem.getQuantitySold());
        assertEquals(0.0, stockItem.getTotalSoldValue());
        verify(creditRepository).save(eligible);
        verify(creditRepository, never()).save(recovered);
        verify(commercialStockMovementService).record(
                any(), eq(2L), any(), any(), any(), eq(2), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        verify(dailyOperationService).logOperationInCurrentTransaction(
                eq("com.a"), eq(OperationType.CREDIT_SALE_CANCEL), eq(-20_000.0),
                anyString(), anyString(), eq(0.0), eq(0.0), eq(today));
    }

    @Test
    void executeFailsWhenDailyReportMissing() {
        Credit eligible = credit(2L, CreditStatus.INPROGRESS, 20_000, 2_000, 2_000);
        attachArticle(eligible, 50L, 1, 20_000);
        when(creditRepository.findSalesForCancellationForUpdate(
                any(), any(), any(), eq(OperationType.CREDIT), any(), eq(State.ENABLED)))
                .thenReturn(List.of(eligible));
        when(creditTimelineRepository.existsByCredit_IdAndState(2L, State.ENABLED)).thenReturn(false);
        when(runRepository.save(any(SaleCancellationRun.class))).thenAnswer(inv -> {
            SaleCancellationRun run = inv.getArgument(0);
            run.setId(1L);
            return run;
        });

        CommercialMonthlyStockItem stockItem = stockItem(50L, 1, 20_000, 5_000);
        CommercialMonthlyStock monthlyStock = new CommercialMonthlyStock();
        monthlyStock.setCollector("com.a");
        monthlyStock.setItems(new HashSet<>(Set.of(stockItem)));
        when(commercialMonthlyStockRepository.findByCollectorAndMonthAndYear(any(), anyInt(), anyInt()))
                .thenReturn(Optional.of(monthlyStock));
        when(dailyCommercialReportRepository.findByDateAndCommercialUsername(any(), any()))
                .thenReturn(Optional.empty());

        assertThrows(CustomValidationException.class, () -> service.executeCancellation(executeDto(null)));
        verify(creditRepository, never()).save(any(Credit.class));
    }

    @Test
    void executeIgnoresSalesNotInPreviewIds() {
        Credit extra = credit(3L, CreditStatus.INPROGRESS, 5_000, 0, 0);
        when(creditRepository.findSalesForCancellationForUpdate(
                any(), any(), any(), eq(OperationType.CREDIT), any(), eq(State.ENABLED)))
                .thenReturn(List.of(extra));

        assertThrows(CustomValidationException.class, () -> service.executeCancellation(executeDto(List.of(99L))));
        verify(commercialMonthlyStockRepository, never()).findByCollectorAndMonthAndYear(any(), anyInt(), anyInt());
    }

    private SaleCancellationFilterDto filter() {
        YearMonth month = YearMonth.now();
        return SaleCancellationFilterDto.builder()
                .commercialUsername("com.a")
                .startDate(month.atDay(1))
                .endDate(LocalDate.now())
                .build();
    }

    private SaleCancellationExecuteDto executeDto(List<Long> ids) {
        YearMonth month = YearMonth.now();
        return SaleCancellationExecuteDto.builder()
                .commercialUsername("com.a")
                .startDate(month.atDay(1))
                .endDate(LocalDate.now())
                .cancellationReason("Erreur de saisie")
                .eligibleCreditIds(ids)
                .build();
    }

    private Credit credit(Long id, CreditStatus status, double total, double advance, double paid) {
        Credit c = new Credit();
        c.setId(id);
        c.setReference("CR-" + id);
        c.setStatus(status);
        c.setState(State.ENABLED);
        c.setType(OperationType.CREDIT);
        c.setTotalAmount(total);
        c.setAdvance(advance);
        c.setTotalAmountPaid(paid);
        c.setBeginDate(LocalDate.now());
        c.setTotalPurchase(0.0);
        c.setArticles(new HashSet<>());
        return c;
    }

    private void attachArticle(Credit credit, long articleId, int qty, double unitPrice) {
        Articles article = new Articles();
        article.setId(articleId);
        article.setName("Art");
        article.setMarque("M");
        article.setModel("X");
        article.setType("T");
        article.setCode("A" + articleId);
        CreditArticles ca = new CreditArticles();
        ca.setArticles(article);
        ca.setQuantity(qty);
        ca.setUnitPrice(unitPrice);
        ca.setUnitPurchaseCost(6_000.0);
        credit.setArticles(Set.of(ca));
    }

    private CommercialMonthlyStockItem stockItem(long articleId, int sold, double soldValue, double margin) {
        Articles article = new Articles();
        article.setId(articleId);
        article.setName("Art");
        article.setMarque("M");
        article.setModel("X");
        article.setType("T");
        CommercialMonthlyStockItem item = new CommercialMonthlyStockItem();
        item.setId(7L);
        item.setArticle(article);
        item.setQuantityTaken(10);
        item.setQuantitySold(sold);
        item.setQuantityReturned(0);
        item.setQuantityRemaining(10 - sold);
        item.setTotalSoldValue(soldValue);
        item.setTotalMargeValue(margin);
        item.setWeightedAveragePurchasePrice(6_000.0);
        item.setWeightedAverageUnitPrice(10_000.0);
        return item;
    }
}
