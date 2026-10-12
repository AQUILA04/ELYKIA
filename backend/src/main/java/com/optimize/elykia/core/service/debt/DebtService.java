package com.optimize.elykia.core.service.debt;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.debt.*;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.debt.*;
import com.optimize.elykia.core.entity.inventory.Inventory;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.*;
import com.optimize.elykia.core.repository.*;
import com.optimize.elykia.core.util.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DebtService {

    private final DebtDocumentRepository debtDocumentRepository;
    private final DebtSettlementRepository debtSettlementRepository;
    private final CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    private final DailyCommercialReportRepository dailyCommercialReportRepository;
    private final CreditRepository creditRepository;
    private final UserService userService;

    public DebtDocumentDto getById(Long id) {
        DebtDocument document = debtDocumentRepository.findByIdWithLines(id)
                .orElseThrow(() -> new CustomValidationException("Dette introuvable."));
        assertCanView(document);
        List<DebtSettlement> settlements = debtSettlementRepository.findByDebtDocumentId(id);
        return DebtMapper.toDto(document, settlements);
    }

    public Page<DebtDocumentDto> search(
            String holder,
            DebtType type,
            DebtStatus status,
            Integer year,
            Integer month,
            Pageable pageable) {
        String scopedHolder = scopeHolder(holder);
        return debtDocumentRepository.search(scopedHolder, type, status, year, month, pageable)
                .map(DebtMapper::toDto);
    }

    public DebtSummaryDto summary() {
        double openDebt = debtDocumentRepository.sumOpenDebtRemaining();
        double openSurplus = debtDocumentRepository.sumOpenSurplusRemaining();
        Map<String, Double> byType = new LinkedHashMap<>();
        for (Object[] row : debtDocumentRepository.sumRemainingByType()) {
            if (row[0] != null) {
                byType.put(row[0].toString(), row[1] != null ? ((Number) row[1]).doubleValue() : 0D);
            }
        }
        return DebtSummaryDto.builder()
                .openDebtTotal(ceil(openDebt))
                .openSurplusTotal(ceil(openSurplus))
                .netPosition(ceil(openDebt - openSurplus))
                .remainingByType(byType)
                .pendingMerchandiseMonths(0L)
                .pendingCashGaps(0L)
                .build();
    }

    public MerchandiseYearlyDebtTotals merchandiseYearlyTotals(String holder, int year) {
        List<Object[]> rows = debtDocumentRepository.sumMerchandiseYearlyTotals(holder, year);
        double gross = 0D;
        double settled = 0D;
        if (!rows.isEmpty() && rows.get(0) != null) {
            gross = rows.get(0)[0] != null ? ((Number) rows.get(0)[0]).doubleValue() : 0D;
            settled = rows.get(0)[1] != null ? ((Number) rows.get(0)[1]).doubleValue() : 0D;
        }
        return new MerchandiseYearlyDebtTotals(ceil(gross), ceil(settled));
    }

    public Optional<DebtDocument> findActiveMerchandiseForStock(Long stockId) {
        return debtDocumentRepository.findByMonthlyStockIdAndDebtTypeAndStatusNot(
                stockId, DebtType.MERCHANDISE, DebtStatus.CANCELLED);
    }

    public Optional<DebtDocumentDto> findActiveMerchandiseDtoForStock(Long stockId) {
        return findActiveMerchandiseForStock(stockId).map(d -> {
            List<DebtSettlement> settlements = debtSettlementRepository.findByDebtDocumentId(d.getId());
            return DebtMapper.toDto(
                    debtDocumentRepository.findByIdWithLines(d.getId()).orElse(d),
                    settlements);
        });
    }

    public boolean hasActiveMerchandiseDebt(Long stockId) {
        return debtDocumentRepository.existsActiveMerchandiseForStock(stockId);
    }

    @Transactional
    public DebtDocumentDto createMerchandiseDebt(Long monthlyStockId) {
        requireDebtManagement();
        CommercialMonthlyStock stock = commercialMonthlyStockRepository.findByIdWithItems(monthlyStockId)
                .orElseThrow(() -> new CustomValidationException("Stock mensuel introuvable."));

        assertPastMonth(stock.getYear(), stock.getMonth());

        Optional<DebtDocument> existing = findActiveMerchandiseForStock(stock.getId());
        if (existing.isPresent()) {
            return DebtMapper.toDto(existing.get());
        }

        List<CommercialMonthlyStockItem> residualItems = stock.getItems().stream()
                .filter(i -> i.getQuantityRemaining() != null && i.getQuantityRemaining() > 0)
                .toList();
        if (residualItems.isEmpty()) {
            throw new CustomValidationException("Aucun reste à transformer en dette pour ce mois.");
        }

        DebtDocument document = newDebtDocument(
                stock.getCollector(),
                DebtHolderProfile.COMMERCIAL,
                DebtType.MERCHANDISE,
                DebtPeriodGrain.MONTH,
                stock.getYear(),
                stock.getMonth(),
                null);
        document.setMonthlyStock(stock);

        double gross = 0D;
        int order = 0;
        for (CommercialMonthlyStockItem item : residualItems) {
            int qty = item.getQuantityRemaining();
            double unitPrice = item.getWeightedAverageUnitPrice() != null
                    ? Math.ceil(item.getWeightedAverageUnitPrice())
                    : 0D;
            double amount = ceil(qty * unitPrice);

            item.setQuantityDebt((item.getQuantityDebt() != null ? item.getQuantityDebt() : 0) + qty);
            item.setDebtUnitPrice(unitPrice);
            item.setQuantityRemaining(0);
            item.updateRemaining();

            DebtLine line = new DebtLine();
            line.setArticle(item.getArticle());
            line.setStockItem(item);
            line.setQuantity(qty);
            line.setUnitPrice(unitPrice);
            line.setAmount(amount);
            line.setPriceBasis(DebtPriceBasis.SALE_PMP);
            line.setLabel(articleLabel(item.getArticle()));
            line.setSortOrder(order++);
            document.addLine(line);
            gross += amount;
        }

        document.setGrossAmount(ceil(gross));
        document.refreshRemainingAndStatus();
        commercialMonthlyStockRepository.save(stock);
        DebtDocument saved = debtDocumentRepository.save(document);
        log.info("[DebtService] Dette marchandise créée ref={} stockId={} amount={}",
                saved.getReference(), stock.getId(), saved.getGrossAmount());
        return DebtMapper.toDto(saved);
    }

    @Transactional
    public DebtDocumentDto cancelDebt(Long debtId, String reason) {
        requireDebtManagement();
        DebtDocument document = debtDocumentRepository.findByIdWithLines(debtId)
                .orElseThrow(() -> new CustomValidationException("Dette introuvable."));
        if (document.getStatus() == DebtStatus.CANCELLED) {
            throw new CustomValidationException("Cette dette est déjà annulée.");
        }
        if (safe(document.getPaidAmount()) > 0D || safe(document.getOffsetAmount()) > 0D) {
            throw new CustomValidationException("Impossible d'annuler une dette déjà réglée en partie.");
        }

        if (document.getDebtType() == DebtType.MERCHANDISE) {
            reverseMerchandiseDebt(document);
        } else if (document.getDebtType() == DebtType.INVENTORY_SHORTAGE) {
            throw new CustomValidationException(
                    "Annulez la dette magasinier depuis la réconciliation d'inventaire.");
        }

        document.setStatus(DebtStatus.CANCELLED);
        document.setCancelledBy(currentUsername());
        document.setCancelledAt(LocalDateTime.now());
        document.setCancelReason(reason);
        document.setRemainingAmount(0D);
        return DebtMapper.toDto(debtDocumentRepository.save(document));
    }

    @Transactional
    public DebtDocumentDto createCashDebt(CreateCashDebtRequestDto request) {
        requireDebtManagement();
        if (request.getPeriodGrain() == DebtPeriodGrain.DAY) {
            return createCashDebtForDay(request.getCommercialUsername(), request.getDay());
        }
        if (request.getPeriodGrain() == DebtPeriodGrain.MONTH) {
            return createCashDebtForMonth(request.getCommercialUsername(), request.getYear(), request.getMonth());
        }
        throw new CustomValidationException("Période de caisse invalide.");
    }

    @Transactional
    public DebtDocumentDto recalculateCashDebt(Long debtId) {
        requireDebtManagement();
        DebtDocument document = debtDocumentRepository.findByIdWithLines(debtId)
                .orElseThrow(() -> new CustomValidationException("Dette introuvable."));
        if (document.getDebtType() != DebtType.CASH_SHORTAGE && document.getDebtType() != DebtType.CASH_SURPLUS) {
            throw new CustomValidationException("Seule une dette de caisse peut être recalculée.");
        }
        if (safe(document.getPaidAmount()) > 0D || safe(document.getOffsetAmount()) > 0D) {
            throw new CustomValidationException("Impossible de recalculer une dette déjà réglée.");
        }

        CashGap gap;
        if (document.getPeriodGrain() == DebtPeriodGrain.DAY) {
            gap = computeCashGapForDay(document.getHolderUsername(), document.getPeriodDay());
        } else {
            Set<LocalDate> exclude = new HashSet<>(debtDocumentRepository.findActiveCashDaysInMonth(
                    document.getHolderUsername(), document.getPeriodYear(), document.getPeriodMonth()));
            // allow recompute of same month document without excluding itself (days only)
            gap = computeCashGapForMonth(document.getHolderUsername(), document.getPeriodYear(),
                    document.getPeriodMonth(), exclude);
        }

        if (Math.abs(gap.gap()) < 0.5D) {
            document.setStatus(DebtStatus.CANCELLED);
            document.setCancelledBy(currentUsername());
            document.setCancelledAt(LocalDateTime.now());
            document.setCancelReason("Écart nul après recalcul");
            document.setGrossAmount(0D);
            document.setRemainingAmount(0D);
            document.getLines().clear();
            return DebtMapper.toDto(debtDocumentRepository.save(document));
        }

        DebtType expectedType = gap.gap() > 0 ? DebtType.CASH_SHORTAGE : DebtType.CASH_SURPLUS;
        document.setDebtType(expectedType);
        document.getLines().clear();
        applyCashLines(document, gap);
        document.setGrossAmount(ceil(Math.abs(gap.gap())));
        document.setPaidAmount(0D);
        document.setOffsetAmount(0D);
        document.refreshRemainingAndStatus();
        DebtDocument saved = debtDocumentRepository.save(document);
        if (saved.getDebtType() == DebtType.CASH_SURPLUS) {
            autoOffsetSurplus(saved);
        }
        return DebtMapper.toDto(debtDocumentRepository.findByIdWithLines(saved.getId()).orElse(saved));
    }

    @Transactional
    public DebtDocumentDto createInventoryDebt(
            Inventory inventory,
            String storekeeperUsername,
            List<InventoryItem> items,
            Map<Long, Double> unitPricesByArticleId) {
        requireDebtManagement();
        Optional<DebtDocument> existing = debtDocumentRepository.findByInventoryIdAndDebtTypeAndStatusNot(
                inventory.getId(), DebtType.INVENTORY_SHORTAGE, DebtStatus.CANCELLED);
        if (existing.isPresent()) {
            return DebtMapper.toDto(existing.get());
        }
        if (items == null || items.isEmpty()) {
            throw new CustomValidationException("Aucun article d'écart pour créer la dette magasinier.");
        }

        LocalDate inventoryDate = inventory.getInventoryDate() != null
                ? inventory.getInventoryDate()
                : LocalDate.now();
        DebtDocument document = newDebtDocument(
                storekeeperUsername,
                DebtHolderProfile.STOREKEEPER,
                DebtType.INVENTORY_SHORTAGE,
                DebtPeriodGrain.DAY,
                inventoryDate.getYear(),
                inventoryDate.getMonthValue(),
                inventoryDate);
        document.setInventory(inventory);

        double gross = 0D;
        int order = 0;
        for (InventoryItem item : items) {
            int qty = item.getDifference() != null ? Math.abs(item.getDifference()) : 0;
            if (qty <= 0) {
                continue;
            }
            Articles article = item.getArticle();
            Double purchase = unitPricesByArticleId.get(article.getId());
            if (purchase == null || purchase <= 0D) {
                throw new CustomValidationException(
                        "Prix d'achat manquant pour l'article " + articleLabel(article) + ".");
            }
            double unitPrice = ceil(purchase);
            double amount = ceil(qty * unitPrice);
            DebtLine line = new DebtLine();
            line.setArticle(article);
            line.setInventoryItem(item);
            line.setQuantity(qty);
            line.setUnitPrice(unitPrice);
            line.setAmount(amount);
            line.setPriceBasis(DebtPriceBasis.PURCHASE);
            line.setLabel(articleLabel(article));
            line.setSortOrder(order++);
            document.addLine(line);
            gross += amount;
        }
        if (document.getLines().isEmpty()) {
            throw new CustomValidationException("Aucun écart négatif à transformer en dette.");
        }
        document.setGrossAmount(ceil(gross));
        document.refreshRemainingAndStatus();
        return DebtMapper.toDto(debtDocumentRepository.save(document));
    }

    @Transactional
    public void cancelInventoryDebt(Long inventoryId) {
        requireDebtManagement();
        Optional<DebtDocument> existing = debtDocumentRepository.findByInventoryIdAndDebtTypeAndStatusNot(
                inventoryId, DebtType.INVENTORY_SHORTAGE, DebtStatus.CANCELLED);
        if (existing.isEmpty()) {
            return;
        }
        DebtDocument document = existing.get();
        if (safe(document.getPaidAmount()) > 0D || safe(document.getOffsetAmount()) > 0D) {
            throw new CustomValidationException("Impossible d'annuler une dette magasinier déjà réglée.");
        }
        document.setStatus(DebtStatus.CANCELLED);
        document.setCancelledBy(currentUsername());
        document.setCancelledAt(LocalDateTime.now());
        document.setCancelReason("Annulation réconciliation inventaire");
        document.setRemainingAmount(0D);
        debtDocumentRepository.save(document);
    }

    @Transactional
    public DebtSettlementDto settle(DebtSettleRequestDto request) {
        requireDebtManagement();
        if (request.getDebtIds() == null || request.getDebtIds().isEmpty()) {
            throw new CustomValidationException("Sélectionnez au moins une dette.");
        }

        List<DebtDocument> debts = request.getDebtIds().stream()
                .map(id -> debtDocumentRepository.findById(id)
                        .orElseThrow(() -> new CustomValidationException("Dette introuvable: " + id)))
                .sorted(Comparator
                        .comparing(DebtDocument::getPeriodYear, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(DebtDocument::getPeriodMonth, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(DebtDocument::getPeriodDay, Comparator.nullsLast(LocalDate::compareTo))
                        .thenComparing(DebtDocument::getId))
                .toList();

        for (DebtDocument debt : debts) {
            if (debt.getDebtType() == DebtType.CASH_SURPLUS) {
                throw new CustomValidationException("Un avoir ne se règle pas comme une dette.");
            }
            if (debt.getStatus() == DebtStatus.CANCELLED || debt.getStatus() == DebtStatus.SETTLED) {
                throw new CustomValidationException("La dette " + debt.getReference() + " n'est plus ouverte.");
            }
        }

        double totalRemaining = debts.stream().mapToDouble(d -> safe(d.getRemainingAmount())).sum();
        double amountToSettle = request.getAmount() != null ? request.getAmount() : totalRemaining;
        amountToSettle = ceil(amountToSettle);
        if (amountToSettle <= 0D) {
            throw new CustomValidationException("Montant de règlement invalide.");
        }
        if (amountToSettle > totalRemaining + 0.5D) {
            throw new CustomValidationException("Le montant dépasse le reste à payer.");
        }

        DebtDocument surplus = null;
        if (request.getSettlementMode() == DebtSettlementMode.SURPLUS_OFFSET) {
            surplus = resolveSurplusForOffset(request.getSurplusDebtId(), debts.get(0).getHolderUsername());
            if (safe(surplus.getRemainingAmount()) + 0.5D < amountToSettle) {
                throw new CustomValidationException("Avoir insuffisant pour ce règlement.");
            }
        }
        if (request.getSettlementMode() == DebtSettlementMode.WRITE_OFF
                && (request.getNote() == null || request.getNote().isBlank())) {
            throw new CustomValidationException("Un motif est obligatoire pour un abandon de dette.");
        }

        DebtSettlement settlement = new DebtSettlement();
        settlement.setReference(nextSettlementReference());
        settlement.setSettlementMode(request.getSettlementMode());
        settlement.setAmount(amountToSettle);
        settlement.setSurplusDebt(surplus);
        settlement.setNote(request.getNote());
        settlement.setPerformedBy(currentUsername());
        settlement.setPerformedAt(LocalDateTime.now());

        double remainingToAllocate = amountToSettle;
        for (DebtDocument debt : debts) {
            if (remainingToAllocate <= 0D) {
                break;
            }
            double apply = Math.min(safe(debt.getRemainingAmount()), remainingToAllocate);
            apply = ceil(apply);
            if (apply <= 0D) {
                continue;
            }
            if (request.getSettlementMode() == DebtSettlementMode.SURPLUS_OFFSET) {
                debt.setOffsetAmount(safe(debt.getOffsetAmount()) + apply);
            } else {
                debt.setPaidAmount(safe(debt.getPaidAmount()) + apply);
            }
            debt.refreshRemainingAndStatus();
            debtDocumentRepository.save(debt);

            DebtAllocation allocation = new DebtAllocation();
            allocation.setDebtDocument(debt);
            allocation.setAmount(apply);
            settlement.addAllocation(allocation);
            remainingToAllocate = ceil(remainingToAllocate - apply);
        }

        if (surplus != null) {
            surplus.setPaidAmount(safe(surplus.getPaidAmount()) + amountToSettle);
            surplus.refreshRemainingAndStatus();
            debtDocumentRepository.save(surplus);
        }

        DebtSettlement saved = debtSettlementRepository.save(settlement);
        log.info("[DebtService] Règlement {} mode={} amount={} debts={}",
                saved.getReference(), saved.getSettlementMode(), saved.getAmount(), request.getDebtIds());
        return DebtMapper.toSettlementDto(saved);
    }

    private DebtDocumentDto createCashDebtForDay(String commercialUsername, LocalDate day) {
        if (day == null) {
            throw new CustomValidationException("La date du jour est obligatoire.");
        }
        if (!day.isBefore(LocalDate.now())) {
            throw new CustomValidationException("La dette de caisse journalière ne concerne qu'un jour passé.");
        }
        Optional<DebtDocument> monthDebt = debtDocumentRepository.findActiveCashMonth(
                commercialUsername, day.getYear(), day.getMonthValue());
        if (monthDebt.isPresent()) {
            throw new CustomValidationException(
                    "Une position de caisse mensuelle existe déjà pour " + day.getMonthValue() + "/" + day.getYear()
                            + ".");
        }
        Optional<DebtDocument> existing = debtDocumentRepository.findActiveCashDay(commercialUsername, day);
        if (existing.isPresent()) {
            return DebtMapper.toDto(existing.get());
        }

        CashGap gap = computeCashGapForDay(commercialUsername, day);
        if (Math.abs(gap.gap()) < 0.5D) {
            throw new CustomValidationException("Aucun écart de caisse pour ce jour.");
        }
        DebtType type = gap.gap() > 0 ? DebtType.CASH_SHORTAGE : DebtType.CASH_SURPLUS;
        DebtDocument document = newDebtDocument(
                commercialUsername,
                DebtHolderProfile.COMMERCIAL,
                type,
                DebtPeriodGrain.DAY,
                day.getYear(),
                day.getMonthValue(),
                day);
        DailyCommercialReport report = dailyCommercialReportRepository
                .findByDateAndCommercialUsername(day, commercialUsername)
                .orElse(null);
        document.setDailyReport(report);
        applyCashLines(document, gap);
        document.setGrossAmount(ceil(Math.abs(gap.gap())));
        document.refreshRemainingAndStatus();
        DebtDocument saved = debtDocumentRepository.save(document);
        if (saved.getDebtType() == DebtType.CASH_SURPLUS) {
            autoOffsetSurplus(saved);
        }
        return DebtMapper.toDto(debtDocumentRepository.findByIdWithLines(saved.getId()).orElse(saved));
    }

    private DebtDocumentDto createCashDebtForMonth(String commercialUsername, Integer year, Integer month) {
        if (year == null || month == null) {
            throw new CustomValidationException("L'année et le mois sont obligatoires.");
        }
        YearMonth ym = YearMonth.of(year, month);
        if (!ym.isBefore(YearMonth.now())) {
            throw new CustomValidationException("La dette de caisse mensuelle ne concerne qu'un mois passé.");
        }
        Optional<DebtDocument> existing = debtDocumentRepository.findActiveCashMonth(commercialUsername, year, month);
        if (existing.isPresent()) {
            return DebtMapper.toDto(existing.get());
        }
        Set<LocalDate> excludedDays = new HashSet<>(
                debtDocumentRepository.findActiveCashDaysInMonth(commercialUsername, year, month));
        CashGap gap = computeCashGapForMonth(commercialUsername, year, month, excludedDays);
        if (Math.abs(gap.gap()) < 0.5D) {
            throw new CustomValidationException("Aucun écart de caisse restant pour ce mois.");
        }
        DebtType type = gap.gap() > 0 ? DebtType.CASH_SHORTAGE : DebtType.CASH_SURPLUS;
        DebtDocument document = newDebtDocument(
                commercialUsername,
                DebtHolderProfile.COMMERCIAL,
                type,
                DebtPeriodGrain.MONTH,
                year,
                month,
                null);
        applyCashLines(document, gap);
        document.setGrossAmount(ceil(Math.abs(gap.gap())));
        document.refreshRemainingAndStatus();
        DebtDocument saved = debtDocumentRepository.save(document);
        if (saved.getDebtType() == DebtType.CASH_SURPLUS) {
            autoOffsetSurplus(saved);
        }
        return DebtMapper.toDto(debtDocumentRepository.findByIdWithLines(saved.getId()).orElse(saved));
    }

    private void autoOffsetSurplus(DebtDocument surplus) {
        List<DebtDocument> shortages = debtDocumentRepository.findOpenByHolderAndType(
                surplus.getHolderUsername(),
                DebtType.CASH_SHORTAGE,
                List.of(DebtStatus.OPEN, DebtStatus.PARTIALLY_SETTLED));
        double available = safe(surplus.getRemainingAmount());
        if (available <= 0D || shortages.isEmpty()) {
            return;
        }
        DebtSettleRequestDto request = new DebtSettleRequestDto();
        request.setDebtIds(shortages.stream().map(DebtDocument::getId).toList());
        request.setSettlementMode(DebtSettlementMode.SURPLUS_OFFSET);
        request.setSurplusDebtId(surplus.getId());
        request.setAmount(Math.min(available, shortages.stream().mapToDouble(d -> safe(d.getRemainingAmount())).sum()));
        request.setNote("Imputation automatique du surplus de caisse");
        settle(request);
    }

    private CashGap computeCashGapForDay(String commercial, LocalDate day) {
        DailyCommercialReport report = dailyCommercialReportRepository
                .findByDateAndCommercialUsername(day, commercial)
                .orElse(null);
        double toDeposit = report != null && report.getTotalAmountToDeposit() != null
                ? report.getTotalAmountToDeposit()
                : 0D;
        double deposited = report != null && report.getTotalAmountDeposited() != null
                ? report.getTotalAmountDeposited()
                : 0D;
        double cashSales = sumCashSales(commercial, day, day);
        double declared = toDeposit + cashSales;
        return new CashGap(toDeposit, cashSales, deposited, declared - deposited,
                report != null ? safe(report.getTotalAdvancesAmount()) : 0D,
                report != null ? safe(report.getCollectionsAmount()) : 0D,
                report != null ? safe(report.getTontineCollectionsAmount()) : 0D,
                report != null ? safe(report.getNewAccountsBalance()) : 0D);
    }

    private CashGap computeCashGapForMonth(String commercial, int year, int month, Set<LocalDate> excludedDays) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = YearMonth.of(year, month).atEndOfMonth();
        List<DailyCommercialReport> reports = dailyCommercialReportRepository
                .findByCommercialUsernameAndDateBetweenOrderByDateAsc(commercial, start, end);
        double toDeposit = 0D;
        double deposited = 0D;
        double advances = 0D;
        double collections = 0D;
        double tontine = 0D;
        double newBalance = 0D;
        for (DailyCommercialReport report : reports) {
            if (excludedDays != null && excludedDays.contains(report.getDate())) {
                continue;
            }
            toDeposit += safe(report.getTotalAmountToDeposit());
            deposited += safe(report.getTotalAmountDeposited());
            advances += safe(report.getTotalAdvancesAmount());
            collections += safe(report.getCollectionsAmount());
            tontine += safe(report.getTontineCollectionsAmount());
            newBalance += safe(report.getNewAccountsBalance());
        }
        double cashSales = 0D;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (excludedDays != null && excludedDays.contains(d)) {
                continue;
            }
            cashSales += sumCashSales(commercial, d, d);
        }
        double declared = toDeposit + cashSales;
        return new CashGap(toDeposit, cashSales, deposited, declared - deposited,
                advances, collections, tontine, newBalance);
    }

    private double sumCashSales(String commercial, LocalDate start, LocalDate end) {
        Double sum = creditRepository.sumCashSalesAmountBetween(commercial, start, end, State.ENABLED);
        return sum != null ? sum : 0D;
    }

    private void applyCashLines(DebtDocument document, CashGap gap) {
        int order = 0;
        document.addLine(cashLine("ADVANCES", "Avances ventes à crédit", gap.advances(), order++));
        document.addLine(cashLine("COLLECTIONS", "Recouvrements", gap.collections(), order++));
        document.addLine(cashLine("TONTINE", "Collectes tontine", gap.tontine(), order++));
        document.addLine(cashLine("NEW_BALANCE", "Soldes nouveaux comptes", gap.newBalance(), order++));
        document.addLine(cashLine("CASH_SALES", "Ventes au comptant", gap.cashSales(), order++));
        document.addLine(cashLine("DECLARED", "Total déclaré (à verser + comptant)", gap.toDeposit() + gap.cashSales(), order++));
        document.addLine(cashLine("DEPOSITED", "Total versé", gap.deposited(), order++));
        document.addLine(cashLine("GAP", gap.gap() >= 0 ? "Manquant" : "Surplus", Math.abs(gap.gap()), order));
    }

    private DebtLine cashLine(String code, String label, double amount, int order) {
        DebtLine line = new DebtLine();
        line.setLineCode(code);
        line.setLabel(label);
        line.setAmount(ceil(amount));
        line.setSortOrder(order);
        return line;
    }

    private void reverseMerchandiseDebt(DebtDocument document) {
        CommercialMonthlyStock stock = document.getMonthlyStock();
        if (stock == null) {
            stock = commercialMonthlyStockRepository.findByIdWithItems(
                    document.getMonthlyStock() != null ? document.getMonthlyStock().getId() : -1L)
                    .orElse(null);
        } else {
            stock = commercialMonthlyStockRepository.findByIdWithItems(stock.getId()).orElse(stock);
        }
        if (stock == null) {
            throw new CustomValidationException("Stock mensuel lié introuvable.");
        }
        Map<Long, CommercialMonthlyStockItem> byId = stock.getItems().stream()
                .filter(i -> i.getId() != null)
                .collect(Collectors.toMap(CommercialMonthlyStockItem::getId, i -> i));
        for (DebtLine line : document.getLines()) {
            if (line.getStockItem() == null) {
                continue;
            }
            CommercialMonthlyStockItem item = byId.get(line.getStockItem().getId());
            if (item == null) {
                continue;
            }
            int qty = line.getQuantity() != null ? line.getQuantity() : 0;
            item.setQuantityDebt(Math.max(0, (item.getQuantityDebt() != null ? item.getQuantityDebt() : 0) - qty));
            if (item.getQuantityDebt() == 0) {
                item.setDebtUnitPrice(0D);
            }
            item.updateRemaining();
        }
        commercialMonthlyStockRepository.save(stock);
    }

    private DebtDocument resolveSurplusForOffset(Long surplusDebtId, String holder) {
        DebtDocument surplus;
        if (surplusDebtId != null) {
            surplus = debtDocumentRepository.findById(surplusDebtId)
                    .orElseThrow(() -> new CustomValidationException("Avoir introuvable."));
        } else {
            List<DebtDocument> open = debtDocumentRepository.findOpenByHolderAndType(
                    holder, DebtType.CASH_SURPLUS, List.of(DebtStatus.OPEN, DebtStatus.PARTIALLY_SETTLED));
            if (open.isEmpty()) {
                throw new CustomValidationException("Aucun avoir de surplus disponible.");
            }
            surplus = open.get(0);
        }
        if (surplus.getDebtType() != DebtType.CASH_SURPLUS) {
            throw new CustomValidationException("La pièce sélectionnée n'est pas un avoir.");
        }
        if (!Objects.equals(surplus.getHolderUsername(), holder)) {
            throw new CustomValidationException("L'avoir doit appartenir au même titulaire.");
        }
        return surplus;
    }

    private DebtDocument newDebtDocument(
            String holder,
            DebtHolderProfile profile,
            DebtType type,
            DebtPeriodGrain grain,
            Integer year,
            Integer month,
            LocalDate day) {
        DebtDocument document = new DebtDocument();
        document.setReference(nextDebtReference());
        document.setHolderUsername(holder);
        document.setHolderProfile(profile);
        document.setDebtType(type);
        document.setPeriodGrain(grain);
        document.setPeriodYear(year);
        document.setPeriodMonth(month);
        document.setPeriodDay(day);
        document.setStatus(DebtStatus.OPEN);
        document.setCreatedBy(currentUsername());
        return document;
    }

    private String nextDebtReference() {
        String ref;
        do {
            ref = "DET-" + RandomStringUtils.randomAlphanumeric(8).toUpperCase();
        } while (debtDocumentRepository.existsByReference(ref));
        return ref;
    }

    private String nextSettlementReference() {
        String ref;
        do {
            ref = "REG-" + RandomStringUtils.randomAlphanumeric(8).toUpperCase();
        } while (debtSettlementRepository.existsByReference(ref));
        return ref;
    }

    private void assertPastMonth(Integer year, Integer month) {
        if (year == null || month == null) {
            throw new CustomValidationException("Mois de stock invalide.");
        }
        YearMonth stockMonth = YearMonth.of(year, month);
        if (!stockMonth.isBefore(YearMonth.now())) {
            throw new CustomValidationException("La dette marchandise ne peut être créée que pour un mois passé.");
        }
    }

    private void requireDebtManagement() {
        if (!hasDebtManagement()) {
            throw new CustomValidationException("Permission ROLE_DEBT_MANAGEMENT requise.");
        }
    }

    private void assertCanView(DebtDocument document) {
        if (hasDebtManagement()) {
            return;
        }
        String username = currentUsername();
        if (!Objects.equals(username, document.getHolderUsername())) {
            throw new CustomValidationException("Accès refusé à cette dette.");
        }
    }

    private String scopeHolder(String holder) {
        if (hasDebtManagement()) {
            return holder;
        }
        return currentUsername();
    }

    private boolean hasDebtManagement() {
        var permissions = userService.getCurrentUser().getPermissions();
        return permissions != null && permissions.stream()
                .anyMatch(p -> UserPermissionConstant.DEBT_MANAGEMENT.equals(p.getName())
                        || UserPermissionConstant.ADMIN.equals(p.getName()));
    }

    private String currentUsername() {
        return userService.getCurrentUser().getUsername();
    }

    private static String articleLabel(Articles article) {
        if (article == null) {
            return "";
        }
        String commercial = article.getCommercialName();
        String name = article.getName();
        return ((commercial != null ? commercial + " " : "") + (name != null ? name : "")).trim();
    }

    private static double safe(Double value) {
        return value != null ? value : 0D;
    }

    private static double ceil(double value) {
        return Math.ceil(value);
    }

    public record MerchandiseYearlyDebtTotals(double globalDebt, double totalSettled) {
    }

    private record CashGap(
            double toDeposit,
            double cashSales,
            double deposited,
            double gap,
            double advances,
            double collections,
            double tontine,
            double newBalance) {
    }
}
