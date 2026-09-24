package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleCancellationService {

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

    /**
     * Contrôle strict des dates : mois en cours uniquement et intervalle <= 31 jours.
     */
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

    /**
     * Simulation (Dry-Run) : identifie les ventes éligibles et celles rejetées pour recouvrements existants.
     */
    @Transactional(readOnly = true)
    public SaleCancellationPreviewDto previewCancellation(SaleCancellationFilterDto filter) {
        validateDates(filter.getStartDate(), filter.getEndDate());
        if (!StringUtils.hasText(filter.getCommercialUsername())) {
            throw new CustomValidationException("Le nom d'utilisateur du commercial est obligatoire.");
        }

        List<Credit> sales = creditRepository.findSalesForCancellation(
                filter.getCommercialUsername(),
                filter.getStartDate(),
                filter.getEndDate(),
                filter.getCreditStatus(),
                State.ENABLED);

        List<SaleCancellationPreviewDto.EligibleSaleItemDto> eligibleList = new ArrayList<>();
        List<SaleCancellationPreviewDto.ExcludedSaleItemDto> excludedList = new ArrayList<>();
        Map<Long, SaleCancellationPreviewDto.StockImpactItemDto> stockImpactMap = new LinkedHashMap<>();

        double eligibleAmount = 0.0;
        double excludedAmount = 0.0;

        for (Credit credit : sales) {
            double advance = credit.getAdvance() != null ? credit.getAdvance() : 0.0;
            double paid = credit.getTotalAmountPaid() != null ? credit.getTotalAmountPaid() : 0.0;
            // Une vente avec une avance initiale a totalAmountPaid = advance à la création.
            // Le recouvrement réel postérieur correspond au montant payé excédant l'avance, ou à l'existence d'une timeline active.
            double recoveryAmount = Math.max(0.0, paid - advance);
            boolean hasRecovery = recoveryAmount > 0.01
                    || creditTimelineRepository.existsByCredit_IdAndState(credit.getId(), State.ENABLED);

            if (hasRecovery) {
                excludedList.add(SaleCancellationPreviewDto.ExcludedSaleItemDto.builder()
                        .creditId(credit.getId())
                        .reference(credit.getReference())
                        .clientName(credit.getClient() != null ? credit.getClient().getFullName() : "—")
                        .saleDate(credit.getBeginDate())
                        .totalAmount(credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0)
                        .paidAmount(paid)
                        .reason("Recouvrement perçu après-vente (recouvré : " + String.format("%.0f", (recoveryAmount > 0.01 ? recoveryAmount : paid)) + " FCFA)")
                        .build());
                excludedAmount += (credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0);
            } else {
                StringBuilder articlesSummary = new StringBuilder();
                if (credit.getArticles() != null) {
                    for (CreditArticles ca : credit.getArticles()) {
                        String name = ca.getArticles() != null ? ca.getArticles().getCommercialName() : "Article #" + ca.getArticlesId();
                        int qty = ca.getQuantity() != null ? ca.getQuantity() : 0;
                        if (articlesSummary.length() > 0) articlesSummary.append(", ");
                        articlesSummary.append(qty).append("x ").append(name);

                        // Accumulation de l'impact stock
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
                        .totalAmount(credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0)
                        .advance(credit.getAdvance() != null ? credit.getAdvance() : 0.0)
                        .articlesSummary(articlesSummary.toString())
                        .build());
                eligibleAmount += (credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0);
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

    /**
     * Exécution effective de l'annulation des ventes d'un commercial.
     */
    @Transactional
    public SaleCancellationRunDto executeCancellation(SaleCancellationExecuteDto executeDto) {
        validateDates(executeDto.getStartDate(), executeDto.getEndDate());
        if (!StringUtils.hasText(executeDto.getCancellationReason())) {
            throw new CustomValidationException("Le motif d'annulation est obligatoire pour l'audit.");
        }

        String adminUsername = userService.getCurrentUser() != null
                ? userService.getCurrentUser().getUsername()
                : "ADMIN";

        List<Credit> sales = creditRepository.findSalesForCancellation(
                executeDto.getCommercialUsername(),
                executeDto.getStartDate(),
                executeDto.getEndDate(),
                executeDto.getCreditStatus(),
                State.ENABLED);

        if (sales.isEmpty()) {
            throw new CustomValidationException("Aucune vente trouvée pour les critères spécifiés.");
        }

        SaleCancellationRun run = new SaleCancellationRun();
        run.setCommercialUsername(executeDto.getCommercialUsername());
        run.setStartDate(executeDto.getStartDate());
        run.setEndDate(executeDto.getEndDate());
        run.setCreditStatus(executeDto.getCreditStatus());
        run.setCancellationReason(executeDto.getCancellationReason());
        run.setTriggeredBy(adminUsername);
        run.setStatus(SaleCancellationRunStatus.PENDING);
        run.setTotalSalesFound(sales.size());
        run = runRepository.save(run);

        List<SaleCancellationPdfService.CancelledSaleRow> cancelledRows = new ArrayList<>();
        List<SaleCancellationPdfService.ExcludedSaleRow> excludedRows = new ArrayList<>();

        double cancelledAmount = 0.0;
        double excludedAmount = 0.0;

        try {
            run.setStatus(SaleCancellationRunStatus.PROCESSING);
            runRepository.save(run);

            LocalDate now = LocalDate.now();
            // Récupérer le stock mensuel du commercial pour le mois en cours
            CommercialMonthlyStock monthlyStock = commercialMonthlyStockRepository
                    .findByCollectorAndMonthAndYear(executeDto.getCommercialUsername(), now.getMonthValue(), now.getYear())
                    .orElseGet(() -> {
                        CommercialMonthlyStock newStock = new CommercialMonthlyStock();
                        newStock.setCollector(executeDto.getCommercialUsername());
                        newStock.setMonth(now.getMonthValue());
                        newStock.setYear(now.getYear());
                        return commercialMonthlyStockRepository.save(newStock);
                    });

            int pdfCount = 0;

            for (Credit credit : sales) {
                // Règle 1 : rejet strict si la vente a déjà fait l'objet de recouvrements ultérieurs
                double advance = credit.getAdvance() != null ? credit.getAdvance() : 0.0;
                double paid = credit.getTotalAmountPaid() != null ? credit.getTotalAmountPaid() : 0.0;
                double recoveryAmount = Math.max(0.0, paid - advance);
                boolean hasRecovery = recoveryAmount > 0.01
                        || creditTimelineRepository.existsByCredit_IdAndState(credit.getId(), State.ENABLED);

                if (hasRecovery) {
                    excludedRows.add(new SaleCancellationPdfService.ExcludedSaleRow(
                            credit.getReference(),
                            credit.getClient() != null ? credit.getClient().getFullName() : "—",
                            credit.getBeginDate() != null ? credit.getBeginDate().toString() : "—",
                            credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0,
                            paid,
                            "Recouvrement perçu après-vente (recouvré : " + String.format("%.0f", (recoveryAmount > 0.01 ? recoveryAmount : paid)) + " FCFA)"));
                    excludedAmount += (credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0);
                    continue;
                }

                // Phase A : Archivage PDF de la vente avant modification
                byte[] salePdf = pdfService.generateSaleAuditPdf(credit, executeDto.getCancellationReason(), adminUsername);
                String salePdfName = String.format("audit_vente_%s.pdf", credit.getReference());
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

                // Phase B : Réintégration dans le stock commercial du mois en cours
                if (credit.getArticles() != null) {
                    for (CreditArticles ca : credit.getArticles()) {
                        if (ca.getArticles() == null) continue;

                        CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                                .filter(item -> item.getArticle().getId().equals(ca.getArticles().getId()))
                                .findFirst()
                                .orElseGet(() -> {
                                    CommercialMonthlyStockItem newItem = new CommercialMonthlyStockItem();
                                    newItem.setArticle(ca.getArticles());
                                    newItem.setMonthlyStock(monthlyStock);
                                    monthlyStock.addItem(newItem);
                                    return commercialMonthlyStockItemRepository.save(newItem);
                                });

                        int qty = ca.getQuantity() != null ? ca.getQuantity() : 0;
                        int beforeQty = stockItem.getQuantityRemaining();
                        stockItem.setQuantitySold(Math.max(0, stockItem.getQuantitySold() - qty));
                        stockItem.updateRemaining();
                        commercialMonthlyStockItemRepository.save(stockItem);

                        // Mouvement de stock d'annulation
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
                                ca.getUnitPrice(),
                                0.0,
                                "CREDIT_CANCEL",
                                credit.getId()
                        );
                    }
                }

                // Phase C : Décrémentation du DailyCommercialReport de la date de la vente
                LocalDate saleDate = credit.getBeginDate() != null ? credit.getBeginDate() : now;
                DailyCommercialReport report = dailyCommercialReportRepository
                        .findByDateAndCommercialUsername(saleDate, executeDto.getCommercialUsername())
                        .orElse(null);

                if (report != null) {
                    report.setCreditSalesCount(Math.max(0, report.getCreditSalesCount() - 1));
                    double saleAmt = credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0;
                    report.setCreditSalesAmount(Math.max(0.0, report.getCreditSalesAmount() - saleAmt));
                    Double totalPurch = credit.getTotalPurchase() != null ? credit.getTotalPurchase() : credit.calculTotalPurchase();
                    double margin = saleAmt - (totalPurch != null ? totalPurch : 0.0);
                    report.setCreditSalesMargin(Math.max(0.0, report.getCreditSalesMargin() - margin));

                    Double adv = credit.getAdvance() != null ? credit.getAdvance() : 0.0;
                    if (adv > 0) {
                        report.setTotalAdvancesAmount(Math.max(0.0, report.getTotalAdvancesAmount() - adv));
                        report.setTotalAmountToDeposit(Math.max(0.0, report.getTotalAmountToDeposit() - adv));
                    }
                    reportPersistence.save(report);
                }

                // Phase D : Traçabilité dans le journal d'opérations (DailyOperationLog)
                dailyOperationService.logOperation(
                        executeDto.getCommercialUsername(),
                        OperationType.CREDIT_SALE_CANCEL,
                        -(credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0),
                        "ANNUL-" + credit.getReference(),
                        "Annulation de vente (Ref: " + credit.getReference() + ", Admin: " + adminUsername + ", Motif: " + executeDto.getCancellationReason() + ")",
                        0.0,
                        0.0,
                        now);

                // Phase E : Mise à jour du statut du crédit et du client
                credit.setStatus(CreditStatus.CANCELLED);
                credit.setState(State.DELETED);
                creditRepository.save(credit);

                if (credit.getClientId() != null && ClientType.CLIENT.equals(credit.getClientType())) {
                    CreditPurpose purpose = credit.getCreditPurpose() != null ? credit.getCreditPurpose() : CreditPurpose.PERSONAL;
                    if (CreditPurpose.BUSINESS.equals(purpose)) {
                        if (!creditRepository.hasCreditInProgressForPurpose(credit.getClientId(), CreditPurpose.BUSINESS)) {
                            clientService.updateBusinessCreditInProgress(credit.getClientId(), Boolean.FALSE);
                        }
                    } else {
                        if (!creditRepository.hasCreditInProgressForPurpose(credit.getClientId(), CreditPurpose.PERSONAL)) {
                            clientService.updateCreditStatus(credit.getClientId(), Boolean.FALSE);
                        }
                    }
                }

                cancelledAmount += (credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0);
                StringBuilder summaryArts = new StringBuilder();
                if (credit.getArticles() != null) {
                    for (CreditArticles a : credit.getArticles()) {
                        if (summaryArts.length() > 0) summaryArts.append(", ");
                        summaryArts.append(a.getQuantity()).append("x ").append(a.getArticles() != null ? a.getArticles().getCommercialName() : "");
                    }
                }
                cancelledRows.add(new SaleCancellationPdfService.CancelledSaleRow(
                        credit.getReference(),
                        credit.getClient() != null ? credit.getClient().getFullName() : "—",
                        saleDate.toString(),
                        credit.getStatus() != null ? credit.getStatus().name() : "VALIDATED",
                        credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0,
                        summaryArts.toString()));
            }

            commercialMonthlyStockRepository.save(monthlyStock);

            // Phase F : Génération du rapport de synthèse global
            run.setCancelledSalesCount(cancelledRows.size());
            run.setCancelledSalesAmount(cancelledAmount);
            run.setExcludedSalesCount(excludedRows.size());
            run.setExcludedSalesAmount(excludedAmount);
            run.setPdfFileCount(pdfCount);

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

            run.setArchiveFileName(summaryFileName);
            run.setStatus(SaleCancellationRunStatus.COMPLETED);
            run.setExcludedSalesDetails(objectMapper.writeValueAsString(excludedRows));
            run = runRepository.save(run);

            log.info("Annulation de ventes terminée avec succès pour run {}: {} annulées, {} exclues",
                    run.getId(), cancelledRows.size(), excludedRows.size());

        } catch (Exception e) {
            log.error("Échec critique lors du traitement du run d'annulation de ventes {}: {}", run.getId(), e.getMessage(), e);
            run.setStatus(SaleCancellationRunStatus.FAILED);
            run.setErrorMessage(e.getMessage());
            run = runRepository.save(run);
        }

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

    public record DownloadableFile(String fileName, byte[] content) {}
}
