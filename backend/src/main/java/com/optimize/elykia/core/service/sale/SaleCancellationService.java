package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.sale.*;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.*;
import com.optimize.elykia.core.repository.*;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.service.stock.CommercialStockMovementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleCancellationService {

    static final List<CreditStatus> CANCELLABLE_STATUSES = List.of(
            CreditStatus.CREATED,
            CreditStatus.VALIDATED,
            CreditStatus.INPROGRESS);

    private final CreditRepository creditRepository;
    private final CreditTimelineRepository creditTimelineRepository;
    private final CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    private final CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;
    private final CommercialStockMovementService commercialStockMovementService;
    private final DailyCommercialReportRepository dailyCommercialReportRepository;
    private final DailyCommercialReportPersistence reportPersistence;
    private final DailyOperationService dailyOperationService;
    private final ClientService clientService;
    private final UserService userService;

    private final SaleCancellationRunRepository runRepository;
    private final SaleCancellationFileRepository fileRepository;
    private final SaleCancellationPdfService pdfService;
    private final SaleCancellationStorageService storageService;
    private final ObjectMapper objectMapper;

    public void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new CustomValidationException("Les dates de début et de fin sont obligatoires.");
        }
        YearMonth currentMonth = YearMonth.now();
        if (!YearMonth.from(startDate).equals(currentMonth) || !YearMonth.from(endDate).equals(currentMonth)) {
            throw new CustomValidationException("Seules les ventes du mois en cours ("
                    + currentMonth + ") peuvent être annulées.");
        }
        if (startDate.isAfter(endDate)) {
            throw new CustomValidationException("La date de début ne peut pas être postérieure à la date de fin.");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > 31) {
            throw new CustomValidationException("L'intervalle entre les dates ne peut pas dépasser 31 jours.");
        }
    }

    @Transactional(readOnly = true)
    public SaleCancellationPreviewDto previewCancellation(SaleCancellationFilterDto filter) {
        validateDates(filter.getStartDate(), filter.getEndDate());
        if (!StringUtils.hasText(filter.getCommercialUsername())) {
            throw new CustomValidationException("Le nom d'utilisateur du commercial est obligatoire.");
        }

        List<CreditStatus> statuses = resolveCancellableStatuses(filter.getCreditStatus());
        List<Credit> sales = creditRepository.findSalesForCancellation(
                filter.getCommercialUsername(),
                filter.getStartDate(),
                filter.getEndDate(),
                OperationType.CREDIT,
                statuses,
                State.ENABLED);

        List<SaleCancellationPreviewDto.EligibleSaleItemDto> eligibleList = new ArrayList<>();
        List<SaleCancellationPreviewDto.ExcludedSaleItemDto> excludedList = new ArrayList<>();
        Map<Long, SaleCancellationPreviewDto.StockImpactItemDto> stockImpactMap = new LinkedHashMap<>();

        double eligibleAmount = 0.0;
        double excludedAmount = 0.0;

        for (Credit credit : sales) {
            RecoveryCheck recovery = evaluateRecovery(credit);
            if (recovery.hasRecovery()) {
                excludedList.add(SaleCancellationPreviewDto.ExcludedSaleItemDto.builder()
                        .creditId(credit.getId())
                        .reference(credit.getReference())
                        .clientName(credit.getClient() != null ? credit.getClient().getFullName() : "—")
                        .saleDate(credit.getBeginDate())
                        .totalAmount(nz(credit.getTotalAmount()))
                        .paidAmount(recovery.paid())
                        .reason("Recouvrement perçu après-vente (recouvré : "
                                + String.format("%.0f", recovery.displayRecovered()) + " FCFA)")
                        .build());
                excludedAmount += nz(credit.getTotalAmount());
            } else {
                StringBuilder articlesSummary = new StringBuilder();
                if (credit.getArticles() != null) {
                    for (CreditArticles ca : credit.getArticles()) {
                        String name = ca.getArticles() != null
                                ? ca.getArticles().getCommercialName()
                                : "Article #" + ca.getArticlesId();
                        int qty = ca.getQuantity() != null ? ca.getQuantity() : 0;
                        if (articlesSummary.length() > 0) {
                            articlesSummary.append(", ");
                        }
                        articlesSummary.append(qty).append("x ").append(name);

                        if (ca.getArticles() != null) {
                            Long artId = ca.getArticles().getId();
                            SaleCancellationPreviewDto.StockImpactItemDto impact = stockImpactMap.computeIfAbsent(artId, id ->
                                    SaleCancellationPreviewDto.StockImpactItemDto.builder()
                                            .articleId(artId)
                                            .articleCode(ca.getArticles().getCode())
                                            .articleName(ca.getArticles().getCommercialName())
                                            .quantityToReturn(0)
                                            .build());
                            impact.setQuantityToReturn(impact.getQuantityToReturn() + qty);
                        }
                    }
                }

                eligibleList.add(SaleCancellationPreviewDto.EligibleSaleItemDto.builder()
                        .creditId(credit.getId())
                        .reference(credit.getReference())
                        .clientName(credit.getClient() != null ? credit.getClient().getFullName() : "—")
                        .saleDate(credit.getBeginDate())
                        .creditStatus(credit.getStatus() != null ? credit.getStatus().name() : "VALIDATED")
                        .totalAmount(nz(credit.getTotalAmount()))
                        .advance(nz(credit.getAdvance()))
                        .articlesSummary(articlesSummary.toString())
                        .build());
                eligibleAmount += nz(credit.getTotalAmount());
            }
        }

        return SaleCancellationPreviewDto.builder()
                .commercialUsername(filter.getCommercialUsername())
                .startDate(filter.getStartDate())
                .endDate(filter.getEndDate())
                .totalSalesFound(sales.size())
                .eligibleCount(eligibleList.size())
                .eligibleAmount(eligibleAmount)
                .excludedCount(excludedList.size())
                .excludedAmount(excludedAmount)
                .eligibleSales(eligibleList)
                .excludedSales(excludedList)
                .stockImpacts(new ArrayList<>(stockImpactMap.values()))
                .build();
    }

    @Transactional
    public SaleCancellationRunDto executeCancellation(SaleCancellationExecuteDto executeDto) {
        validateDates(executeDto.getStartDate(), executeDto.getEndDate());
        if (!StringUtils.hasText(executeDto.getCancellationReason())) {
            throw new CustomValidationException("Le motif d'annulation est obligatoire pour l'audit.");
        }

        String adminUsername = userService.getCurrentUser() != null
                ? userService.getCurrentUser().getUsername()
                : "ADMIN";

        List<CreditStatus> statuses = resolveCancellableStatuses(executeDto.getCreditStatus());
        List<Credit> sales = creditRepository.findSalesForCancellationForUpdate(
                executeDto.getCommercialUsername(),
                executeDto.getStartDate(),
                executeDto.getEndDate(),
                OperationType.CREDIT,
                statuses,
                State.ENABLED);

        if (executeDto.getEligibleCreditIds() != null) {
            Set<Long> confirmedIds = new HashSet<>(executeDto.getEligibleCreditIds());
            sales = sales.stream().filter(c -> confirmedIds.contains(c.getId())).collect(Collectors.toList());
        }

        if (sales.isEmpty()) {
            throw new CustomValidationException("Aucune vente crédit éligible trouvée pour les critères spécifiés.");
        }

        SaleCancellationRun run = new SaleCancellationRun();
        run.setCommercialUsername(executeDto.getCommercialUsername());
        run.setStartDate(executeDto.getStartDate());
        run.setEndDate(executeDto.getEndDate());
        run.setCreditStatus(executeDto.getCreditStatus());
        run.setCancellationReason(executeDto.getCancellationReason());
        run.setTriggeredBy(adminUsername);
        run.setStatus(SaleCancellationRunStatus.PROCESSING);
        run.setTotalSalesFound(sales.size());
        run = runRepository.save(run);

        List<SaleCancellationPdfService.CancelledSaleRow> cancelledRows = new ArrayList<>();
        List<SaleCancellationPdfService.ExcludedSaleRow> excludedRows = new ArrayList<>();

        double cancelledAmount = 0.0;
        double excludedAmount = 0.0;

        LocalDate now = LocalDate.now();
        CommercialMonthlyStock monthlyStock = commercialMonthlyStockRepository
                .findByCollectorAndMonthAndYear(executeDto.getCommercialUsername(), now.getMonthValue(), now.getYear())
                .orElseThrow(() -> new CustomValidationException(
                        "Stock mensuel commercial introuvable pour " + executeDto.getCommercialUsername()
                                + " (" + now.getMonthValue() + "/" + now.getYear() + ")."));

        List<Credit> toCancel = new ArrayList<>();
        for (Credit credit : sales) {
            RecoveryCheck recovery = evaluateRecovery(credit);
            if (recovery.hasRecovery()) {
                excludedRows.add(new SaleCancellationPdfService.ExcludedSaleRow(
                        credit.getReference(),
                        credit.getClient() != null ? credit.getClient().getFullName() : "—",
                        credit.getBeginDate() != null ? credit.getBeginDate().toString() : "—",
                        nz(credit.getTotalAmount()),
                        recovery.paid(),
                        "Recouvrement perçu après-vente (recouvré : "
                                + String.format("%.0f", recovery.displayRecovered()) + " FCFA)"));
                excludedAmount += nz(credit.getTotalAmount());
                continue;
            }
            assertStockRestorable(credit, monthlyStock);
            LocalDate saleDate = credit.getBeginDate() != null ? credit.getBeginDate() : now;
            dailyCommercialReportRepository
                    .findByDateAndCommercialUsername(saleDate, executeDto.getCommercialUsername())
                    .orElseThrow(() -> new CustomValidationException(
                            "Rapport journalier absent pour le " + saleDate + " / "
                                    + executeDto.getCommercialUsername()
                                    + " (vente " + credit.getReference() + "). Annulation interrompue."));
            toCancel.add(credit);
        }

        int pdfCount = 0;

        for (Credit credit : toCancel) {
            CreditStatus initialStatus = credit.getStatus();

            byte[] salePdf = pdfService.generateSaleAuditPdf(credit, executeDto.getCancellationReason(), adminUsername);
            String salePdfName = String.format("audit_vente_%s.pdf", sanitizeFileToken(credit.getReference()));
            storageService.storeFile(
                    run,
                    salePdfName,
                    SaleCancellationFileType.SALE_AUDIT_PDF,
                    salePdf,
                    credit.getId(),
                    credit.getReference(),
                    credit.getClient() != null ? credit.getClient().getFullName() : "—",
                    credit.getTotalAmount());
            pdfCount++;

            restoreCommercialStock(credit, monthlyStock);

            LocalDate saleDate = credit.getBeginDate() != null ? credit.getBeginDate() : now;
            DailyCommercialReport report = dailyCommercialReportRepository
                    .findByDateAndCommercialUsername(saleDate, executeDto.getCommercialUsername())
                    .orElseThrow(() -> new CustomValidationException(
                            "Rapport journalier absent pour le " + saleDate + " / "
                                    + executeDto.getCommercialUsername()
                                    + " (vente " + credit.getReference() + "). Annulation interrompue."));

            report.setCreditSalesCount(Math.max(0, nz(report.getCreditSalesCount()) - 1));
            double saleAmt = nz(credit.getTotalAmount());
            report.setCreditSalesAmount(Math.max(0.0, nz(report.getCreditSalesAmount()) - saleAmt));
            Double totalPurch = credit.getTotalPurchase() != null ? credit.getTotalPurchase() : credit.calculTotalPurchase();
            double margin = saleAmt - nz(totalPurch);
            report.setCreditSalesMargin(Math.max(0.0, nz(report.getCreditSalesMargin()) - margin));

            double adv = nz(credit.getAdvance());
            if (adv > 0) {
                report.setTotalAdvancesAmount(Math.max(0.0, nz(report.getTotalAdvancesAmount()) - adv));
                report.setTotalAmountToDeposit(Math.max(0.0, nz(report.getTotalAmountToDeposit()) - adv));
            }
            reportPersistence.save(report);

            dailyOperationService.logOperationInCurrentTransaction(
                    executeDto.getCommercialUsername(),
                    OperationType.CREDIT_SALE_CANCEL,
                    -saleAmt,
                    "ANNUL-" + credit.getReference(),
                    "Annulation de vente (Ref: " + credit.getReference() + ", Admin: " + adminUsername
                            + ", Motif: " + executeDto.getCancellationReason() + ")",
                    0.0,
                    0.0,
                    saleDate);

            credit.setStatus(CreditStatus.CANCELLED);
            credit.setState(State.DELETED);
            creditRepository.save(credit);

            if (credit.getClientId() != null && ClientType.CLIENT.equals(credit.getClientType())) {
                CreditPurpose purpose = credit.getCreditPurpose() != null ? credit.getCreditPurpose() : CreditPurpose.PERSONAL;
                if (CreditPurpose.BUSINESS.equals(purpose)) {
                    if (!creditRepository.hasCreditInProgressForPurpose(credit.getClientId(), CreditPurpose.BUSINESS)) {
                        clientService.updateBusinessCreditInProgress(credit.getClientId(), Boolean.FALSE);
                    }
                } else if (!creditRepository.hasCreditInProgressForPurpose(credit.getClientId(), CreditPurpose.PERSONAL)) {
                    clientService.updateCreditStatus(credit.getClientId(), Boolean.FALSE);
                }
            }

            cancelledAmount += saleAmt;
            StringBuilder summaryArts = new StringBuilder();
            if (credit.getArticles() != null) {
                for (CreditArticles a : credit.getArticles()) {
                    if (summaryArts.length() > 0) {
                        summaryArts.append(", ");
                    }
                    summaryArts.append(a.getQuantity()).append("x ")
                            .append(a.getArticles() != null ? a.getArticles().getCommercialName() : "");
                }
            }
            cancelledRows.add(new SaleCancellationPdfService.CancelledSaleRow(
                    credit.getReference(),
                    credit.getClient() != null ? credit.getClient().getFullName() : "—",
                    saleDate.toString(),
                    initialStatus != null ? initialStatus.name() : "VALIDATED",
                    saleAmt,
                    summaryArts.toString()));
        }

        commercialMonthlyStockRepository.save(monthlyStock);

        run.setCancelledSalesCount(cancelledRows.size());
        run.setCancelledSalesAmount(cancelledAmount);
        run.setExcludedSalesCount(excludedRows.size());
        run.setExcludedSalesAmount(excludedAmount);

        byte[] summaryPdf = pdfService.generateSummaryReportPdf(run, cancelledRows, excludedRows);
        String summaryFileName = String.format("rapport_global_annulation_run_%d.pdf", run.getId());
        storageService.storeFile(
                run,
                summaryFileName,
                SaleCancellationFileType.GLOBAL_SUMMARY_PDF,
                summaryPdf,
                null,
                null,
                null,
                cancelledAmount);
        pdfCount++;

        run.setPdfFileCount(pdfCount);
        run.setArchiveFileName(summaryFileName);
        run.setStatus(SaleCancellationRunStatus.COMPLETED);
        try {
            run.setExcludedSalesDetails(objectMapper.writeValueAsString(excludedRows));
        } catch (JsonProcessingException e) {
            throw new CustomValidationException("Impossible de sérialiser le détail des exclusions d'annulation.");
        }
        run = runRepository.save(run);

        log.info("Annulation de ventes terminée avec succès pour run {}: {} annulées, {} exclues",
                run.getId(), cancelledRows.size(), excludedRows.size());

        return SaleCancellationRunDto.fromEntity(run);
    }

    @Transactional(readOnly = true)
    public Page<SaleCancellationRunDto> getRuns(Pageable pageable) {
        return runRepository.findAllByOrderByCreatedDateDesc(pageable)
                .map(SaleCancellationRunDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public SaleCancellationRunDto getRunDetails(Long runId) {
        SaleCancellationRun run = runRepository.findById(runId)
                .orElseThrow(() -> new CustomValidationException("Run d'annulation introuvable: " + runId));
        SaleCancellationRunDto dto = SaleCancellationRunDto.fromEntity(run);

        List<SaleCancellationFile> files = fileRepository.findByRun_IdOrderByIdAsc(runId);
        dto.setFiles(files.stream().map(f -> SaleCancellationRunDto.SaleCancellationFileDto.builder()
                .id(f.getId())
                .fileName(f.getFileName())
                .fileType(f.getFileType().name())
                .creditReference(f.getCreditReference())
                .clientName(f.getClientName())
                .amount(f.getAmount())
                .build()).toList());
        return dto;
    }

    @Transactional(readOnly = true)
    public DownloadableFile downloadFile(Long fileId) {
        SaleCancellationFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new CustomValidationException("Fichier introuvable: " + fileId));
        byte[] content = storageService.downloadFile(file);
        return new DownloadableFile(file.getFileName(), content);
    }

    List<CreditStatus> resolveCancellableStatuses(CreditStatus filter) {
        if (filter == null) {
            return CANCELLABLE_STATUSES;
        }
        if (!CANCELLABLE_STATUSES.contains(filter)) {
            throw new CustomValidationException(
                    "Seules les ventes CREDIT aux statuts CREATED, VALIDATED ou INPROGRESS peuvent être annulées.");
        }
        return List.of(filter);
    }

    private RecoveryCheck evaluateRecovery(Credit credit) {
        double advance = nz(credit.getAdvance());
        double paid = nz(credit.getTotalAmountPaid());
        double recoveryAmount = Math.max(0.0, paid - advance);
        boolean hasRecovery = recoveryAmount > 0.01
                || creditTimelineRepository.existsByCredit_IdAndState(credit.getId(), State.ENABLED);
        return new RecoveryCheck(hasRecovery, paid, recoveryAmount > 0.01 ? recoveryAmount : paid);
    }

    private void assertStockRestorable(Credit credit, CommercialMonthlyStock monthlyStock) {
        if (credit.getArticles() == null || credit.getArticles().isEmpty()) {
            throw new CustomValidationException(
                    "La vente " + credit.getReference() + " n'a aucun article à réintégrer en stock.");
        }
        if (monthlyStock.getItems() == null) {
            throw new CustomValidationException("Le stock mensuel du commercial n'a aucune ligne d'article.");
        }
        for (CreditArticles ca : credit.getArticles()) {
            resolveStockItem(credit, monthlyStock, ca);
        }
    }

    private CommercialMonthlyStockItem resolveStockItem(
            Credit credit, CommercialMonthlyStock monthlyStock, CreditArticles ca) {
        if (ca.getArticles() == null) {
            throw new CustomValidationException(
                    "Article introuvable sur la vente " + credit.getReference() + " : restitution stock impossible.");
        }
        CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                .filter(item -> item.getArticle() != null
                        && item.getArticle().getId().equals(ca.getArticles().getId()))
                .findFirst()
                .orElseThrow(() -> new CustomValidationException(
                        "Article non trouvé dans le stock du commercial : "
                                + ca.getArticles().getCommercialName()
                                + " (vente " + credit.getReference() + ")."));
        int qty = ca.getQuantity() != null ? ca.getQuantity() : 0;
        int sold = stockItem.getQuantitySold() != null ? stockItem.getQuantitySold() : 0;
        if (sold < qty) {
            throw new CustomValidationException(
                    "Quantité vendue insuffisante pour restituer " + qty + " x "
                            + ca.getArticles().getCommercialName()
                            + " (stock vendu actuel : " + sold + ").");
        }
        return stockItem;
    }

    private void restoreCommercialStock(Credit credit, CommercialMonthlyStock monthlyStock) {
        for (CreditArticles ca : credit.getArticles()) {
            CommercialMonthlyStockItem stockItem = resolveStockItem(credit, monthlyStock, ca);
            int qty = ca.getQuantity() != null ? ca.getQuantity() : 0;
            int sold = stockItem.getQuantitySold() != null ? stockItem.getQuantitySold() : 0;

            int beforeQty = stockItem.getQuantityRemaining() != null ? stockItem.getQuantityRemaining() : 0;
            stockItem.setQuantitySold(sold - qty);

            double unitSale = ca.getUnitPrice() != null && ca.getUnitPrice() > 0
                    ? ca.getUnitPrice()
                    : nz(stockItem.getWeightedAverageUnitPrice());
            double lineSold = qty * unitSale;
            stockItem.setTotalSoldValue(Math.max(0.0, nz(stockItem.getTotalSoldValue()) - lineSold));

            double purchasePmp = ca.getUnitPurchaseCost() != null && ca.getUnitPurchaseCost() > 0
                    ? ca.getUnitPurchaseCost()
                    : nz(stockItem.getWeightedAveragePurchasePrice());
            double lineMargin = qty * (unitSale - purchasePmp);
            stockItem.setTotalMargeValue(Math.max(0.0, nz(stockItem.getTotalMargeValue()) - lineMargin));

            stockItem.updateRemaining();
            commercialMonthlyStockItemRepository.save(stockItem);

            commercialStockMovementService.record(
                    stockItem.getId(),
                    credit.getId(),
                    credit.getReference(),
                    CommercialStockMovementType.SALE_CANCELLATION,
                    beforeQty,
                    qty,
                    stockItem.getQuantityRemaining(),
                    null,
                    monthlyStock.getCollector(),
                    stockItem.getArticle().getId(),
                    stockItem.getArticle().getCommercialName(),
                    stockItem.getWeightedAveragePurchasePrice(),
                    unitSale,
                    -lineMargin,
                    "CREDIT_CANCEL",
                    credit.getId()
            );
        }
    }

    private static String sanitizeFileToken(String value) {
        if (!StringUtils.hasText(value)) {
            return "sans_ref";
        }
        return value.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static double nz(Double value) {
        return value != null ? value : 0.0;
    }

    private static int nz(Integer value) {
        return value != null ? value : 0;
    }

    private record RecoveryCheck(boolean hasRecovery, double paid, double displayRecovered) {}

    public record DownloadableFile(String fileName, byte[] content) {}
}
