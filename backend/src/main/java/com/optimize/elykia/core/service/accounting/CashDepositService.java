package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.report.CashDepositSliceDto;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.DailyCommercialReportRepository;
import com.optimize.elykia.core.service.accounting.CashDepositCatchupAllocator.Allocation;
import com.optimize.elykia.core.service.accounting.CashDepositCatchupAllocator.Slice;
import com.optimize.elykia.core.service.report.DailyCommercialReportPersistence;
import com.optimize.elykia.core.service.debt.DebtService;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.util.CashDepositCategoryCalculator;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class CashDepositService extends GenericService<CashDeposit, Long> {

    private static final DateTimeFormatter DAY_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final DailyCommercialReportRepository dailyReportRepository;
    private final DailyCommercialReportPersistence reportPersistence;
    private final DailyOperationService dailyOperationService;
    private final UserService userService;
    private final CashDepositCatchupService catchupService;
    private DebtService debtService;

    public CashDepositService(CashDepositRepository repository,
            DailyCommercialReportRepository dailyReportRepository,
            DailyCommercialReportPersistence reportPersistence,
            DailyOperationService dailyOperationService,
            UserService userService,
            CashDepositCatchupService catchupService) {
        super(repository);
        this.dailyReportRepository = dailyReportRepository;
        this.reportPersistence = reportPersistence;
        this.dailyOperationService = dailyOperationService;
        this.userService = userService;
        this.catchupService = catchupService;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public void setDebtService(DebtService debtService) {
        this.debtService = debtService;
    }

    public CashDeposit createDeposit(CashDeposit deposit) {
        User currentUser = userService.getCurrentUser();
        deposit.setReceivedBy(currentUser.getUsername());
        deposit.setDate(deposit.getDate() != null ? deposit.getDate() : LocalDate.now());

        CashDepositRepository cashDepositRepository = (CashDepositRepository) repository;
        if (StringUtils.hasText(deposit.getReference()) && cashDepositRepository.existsByReference(deposit.getReference())) {
            return cashDepositRepository.findByReference(deposit.getReference()).orElseThrow();
        }

        if (!StringUtils.hasText(deposit.getReference())) {
            deposit.setReference("DEP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        CashDepositCategoryCalculator.normalizeLegacyAmounts(deposit);
        CashDepositCategoryCalculator.validateCategorySplit(
                deposit.getAmount(),
                deposit.getCreditAmount(),
                deposit.getTontineAmount(),
                deposit.getNewBalanceAmount(),
                deposit.getSurplusAmount());

        DailyCommercialReport report = getOrCreateReport(deposit.getDate(), deposit.getCommercialUsername());
        Allocation allocation = CashDepositCatchupAllocator.allocate(
                safe(deposit.getCreditAmount()),
                safe(deposit.getTontineAmount()),
                safe(deposit.getNewBalanceAmount()),
                safe(deposit.getSurplusAmount()),
                catchupService.openTontine(report),
                catchupService.caps(deposit.getCommercialUsername(), deposit.getDate()));

        deposit.setCaptureDate(deposit.getDate());
        if (!allocation.slices().isEmpty()) {
            deposit.setDepositGroupId(java.util.UUID.randomUUID().toString());
            deposit.setCreditAmount(allocation.credit());
            deposit.setTontineAmount(allocation.tontineOnCaptureDay());
            deposit.setNewBalanceAmount(allocation.newBalance());
            deposit.setSurplusAmount(allocation.surplus());
            deposit.setAmount(allocation.captureDayAmount());
        }

        applyDepositToReport(report, deposit.getAmount(), deposit.getCreditAmount(),
                deposit.getTontineAmount(), deposit.getNewBalanceAmount(), deposit.getSurplusAmount());
        report = reportPersistence.save(report);

        deposit.setDailyReport(report);
        CashDeposit saved = cashDepositRepository.save(deposit);

        for (Slice slice : allocation.slices()) {
            DailyCommercialReport sliceReport = getOrCreateReport(slice.date(), deposit.getCommercialUsername());
            applyDepositToReport(sliceReport, slice.amount(), 0.0, slice.amount(), 0.0, 0.0);
            sliceReport = reportPersistence.save(sliceReport);

            CashDeposit child = new CashDeposit();
            child.setAmount(slice.amount());
            child.setCreditAmount(0.0);
            child.setTontineAmount(slice.amount());
            child.setNewBalanceAmount(0.0);
            child.setSurplusAmount(0.0);
            child.setCommercialUsername(deposit.getCommercialUsername());
            child.setDate(slice.date());
            child.setCaptureDate(deposit.getCaptureDate());
            child.setDepositGroupId(deposit.getDepositGroupId());
            child.setParentDeposit(saved);
            child.setReference(deposit.getReference() + "/" + slice.date());
            child.setReceivedBy(deposit.getReceivedBy());
            child.setDailyReport(sliceReport);
            CashDeposit savedChild = cashDepositRepository.save(child);

            dailyOperationService.logOperation(
                    deposit.getCommercialUsername(),
                    OperationType.CASH_DEPOSIT,
                    slice.amount(),
                    "Versement " + savedChild.getId(),
                    "Rattrapage tontine encaissé le " + DAY_FORMAT.format(deposit.getCaptureDate())
                            + " pour la cotisation du " + DAY_FORMAT.format(slice.date()),
                    0.0,
                    0.0,
                    slice.date());
        }

        String catchupDetail = allocation.slices().isEmpty()
                ? ""
                : " Rattrapages tontine: " + allocation.slices().stream()
                        .map(slice -> DAY_FORMAT.format(slice.date()) + " " + String.format("%.0f", slice.amount()))
                        .collect(Collectors.joining(", "));
        String logDetail = String.format(
                "Versement effectué par %s pour le commercial %s pour la date du %s (Crédit: %.0f, Tontine: %.0f, Solde Nx: %.0f%s)%s",
                currentUser.getUsername(),
                deposit.getCommercialUsername() != null ? deposit.getCommercialUsername() : "N/A",
                deposit.getDate(),
                deposit.getCreditAmount(),
                deposit.getTontineAmount(),
                deposit.getNewBalanceAmount(),
                safe(deposit.getSurplusAmount()) > 0
                        ? String.format(", Surplus: %.0f", deposit.getSurplusAmount())
                        : "",
                catchupDetail);

        dailyOperationService.logOperation(
                deposit.getCommercialUsername(),
                OperationType.CASH_DEPOSIT,
                allocation.physicalAmount(),
                "Versement " + saved.getId(),
                logDetail);

        if (debtService != null) {
            debtService.imputeFieldControlFromDeposit(
                    deposit.getCommercialUsername(),
                    deposit.getDate(),
                    safe(deposit.getCreditAmount()),
                    safe(deposit.getTontineAmount()),
                    saved.getReference());
            for (Slice slice : allocation.slices()) {
                debtService.imputeFieldControlFromDeposit(
                        deposit.getCommercialUsername(),
                        slice.date(),
                        0.0,
                        slice.amount(),
                        deposit.getReference() + "/" + slice.date());
            }
        }

        return saved;
    }

    public Page<CashDeposit> getDeposits(LocalDate startDate, LocalDate endDate, String commercialUsername,
            Pageable pageable) {
        Page<CashDeposit> page = Page.empty();
        if (commercialUsername != null) {
            if (startDate != null && endDate != null) {
                page = cashDepositRepository().findByDateBetweenAndCommercialUsername(startDate, endDate,
                        commercialUsername, pageable);
            } else if (startDate != null) {
                page = cashDepositRepository().findByDateAndCommercialUsername(startDate, commercialUsername, pageable);
            }
        } else if (startDate != null && endDate != null) {
            page = cashDepositRepository().findByDateBetween(startDate, endDate, pageable);
        }
        attachGroupDisplay(page.getContent());
        return page;
    }

    public CashDeposit cancelDeposit(Long id) {
        CashDeposit requested = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Versement introuvable."));

        User currentUser = userService.getCurrentUser();
        if (!canCancel(currentUser)) {
            throw new RuntimeException("Seul le gestionnaire ou l'administrateur est autorisé à annuler un versement.");
        }

        List<CashDeposit> group = loadGroup(requested);
        CashDeposit anchor = group.stream()
                .filter(line -> line.getParentDeposit() == null && safe(line.getAmount()) >= 0)
                .findFirst()
                .orElse(requested);
        LocalDate basis = anchor.getCaptureDate() != null ? anchor.getCaptureDate() : anchor.getDate();
        long daysBetween = ChronoUnit.DAYS.between(basis, LocalDate.now());
        if (daysBetween > 3) {
            throw new RuntimeException("Le délai d'annulation de 3 jours est dépassé.");
        }

        List<CashDeposit> positive = group.stream().filter(line -> safe(line.getAmount()) > 0).toList();
        if (positive.isEmpty()) {
            throw new RuntimeException("Impossible d'annuler ce versement.");
        }
        positive.forEach(this::assertDepositNotRemitted);

        String anchorRef = referenceOf(anchor);
        CashDepositRepository cashDepositRepository = cashDepositRepository();
        String cancelReference = "CANCEL-" + anchorRef;
        if (cashDepositRepository.existsByReference(cancelReference)) {
            return cashDepositRepository.findByReference(cancelReference).orElseThrow();
        }

        CashDeposit cancelAnchor = saveCancellation(anchor, cancelReference, currentUser.getUsername(), null);
        CashDeposit returned = requested.getId() != null && requested.getId().equals(anchor.getId())
                ? cancelAnchor
                : null;
        for (CashDeposit line : positive) {
            if (line.getId() != null && line.getId().equals(anchor.getId())) {
                continue;
            }
            CashDeposit cancelChild = saveCancellation(line, "CANCEL-" + referenceOf(line),
                    currentUser.getUsername(), cancelAnchor);
            if (requested.getId() != null && requested.getId().equals(line.getId())) {
                returned = cancelChild;
            }
            dailyOperationService.logOperation(
                    line.getCommercialUsername(),
                    OperationType.CASH_DEPOSIT_CANCEL,
                    -safe(line.getAmount()),
                    "Annulation Versement N° " + line.getId(),
                    "Annulation du rattrapage du " + line.getDate() + " par " + currentUser.getUsername(),
                    0.0,
                    0.0,
                    line.getDate());
        }

        double cancelledAmount = positive.stream().mapToDouble(line -> safe(line.getAmount())).sum();
        dailyOperationService.logOperation(
                anchor.getCommercialUsername(),
                OperationType.CASH_DEPOSIT_CANCEL,
                -cancelledAmount,
                "Annulation Versement N° " + anchor.getId(),
                "Annulation du versement N° " + anchor.getId() + " par " + currentUser.getUsername()
                        + " pour la date du " + basis);

        if (debtService != null) {
            for (CashDeposit line : positive) {
                debtService.reverseFieldControlImputation(line.getReference());
            }
        }

        return returned != null ? returned : cancelAnchor;
    }

    private CashDeposit saveCancellation(CashDeposit original, String cancelReference, String receivedBy,
            CashDeposit cancelParent) {
        if (safe(original.getAmount()) <= 0) {
            CashDeposit header = new CashDeposit();
            header.setAmount(0.0);
            header.setCreditAmount(0.0);
            header.setTontineAmount(0.0);
            header.setNewBalanceAmount(0.0);
            header.setSurplusAmount(0.0);
            header.setCommercialUsername(original.getCommercialUsername());
            header.setDate(original.getDate());
            header.setCaptureDate(original.getCaptureDate());
            header.setDepositGroupId(original.getDepositGroupId());
            header.setParentDeposit(cancelParent);
            header.setReference(cancelReference);
            header.setReceivedBy(receivedBy);
            header.setDailyReport(original.getDailyReport());
            return cashDepositRepository().save(header);
        }

        CashDepositCategoryCalculator.normalizeLegacyAmounts(original);
        double credit = original.getCreditAmount() != null ? original.getCreditAmount() : original.getAmount();
        double tontine = original.getTontineAmount() != null ? original.getTontineAmount() : 0.0;
        double newBalance = original.getNewBalanceAmount() != null ? original.getNewBalanceAmount() : 0.0;
        double surplus = original.getSurplusAmount() != null ? original.getSurplusAmount() : 0.0;

        CashDeposit cancelDeposit = new CashDeposit();
        cancelDeposit.setAmount(-original.getAmount());
        cancelDeposit.setCreditAmount(-credit);
        cancelDeposit.setTontineAmount(-tontine);
        cancelDeposit.setNewBalanceAmount(-newBalance);
        cancelDeposit.setSurplusAmount(-surplus);
        cancelDeposit.setCommercialUsername(original.getCommercialUsername());
        cancelDeposit.setDate(original.getDate());
        cancelDeposit.setCaptureDate(original.getCaptureDate() != null ? original.getCaptureDate() : original.getDate());
        cancelDeposit.setDepositGroupId(original.getDepositGroupId());
        cancelDeposit.setParentDeposit(cancelParent);
        cancelDeposit.setBilletage(null);
        cancelDeposit.setReference(cancelReference);
        cancelDeposit.setReceivedBy(receivedBy);

        DailyCommercialReport report = dailyReportRepository
                .findByDateAndCommercialUsername(cancelDeposit.getDate(), cancelDeposit.getCommercialUsername())
                .orElseThrow(() -> new RuntimeException("Rapport journalier introuvable pour ce versement."));

        applyDepositToReport(report, cancelDeposit.getAmount(), cancelDeposit.getCreditAmount(),
                cancelDeposit.getTontineAmount(), cancelDeposit.getNewBalanceAmount(),
                cancelDeposit.getSurplusAmount());
        report = reportPersistence.save(report);
        cancelDeposit.setDailyReport(report);
        return cashDepositRepository().save(cancelDeposit);
    }

    private DailyCommercialReport getOrCreateReport(LocalDate date, String commercialUsername) {
        return dailyReportRepository.findByDateAndCommercialUsername(date, commercialUsername)
                .orElseGet(() -> {
                    DailyCommercialReport created = new DailyCommercialReport();
                    created.setDate(date);
                    created.setCommercialUsername(commercialUsername);
                    return created;
                });
    }

    private CashDepositRepository cashDepositRepository() {
        return (CashDepositRepository) repository;
    }

    private List<CashDeposit> loadGroup(CashDeposit deposit) {
        if (!StringUtils.hasText(deposit.getDepositGroupId())) {
            return List.of(deposit);
        }
        List<CashDeposit> group = cashDepositRepository()
                .findByDepositGroupIdOrderByDateAscIdAsc(deposit.getDepositGroupId());
        return group == null || group.isEmpty() ? List.of(deposit) : group;
    }

    private void attachGroupDisplay(Collection<CashDeposit> deposits) {
        if (deposits == null || deposits.isEmpty()) {
            return;
        }
        List<String> groupIds = deposits.stream()
                .map(CashDeposit::getDepositGroupId)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        if (groupIds.isEmpty()) {
            return;
        }
        Map<String, List<CashDeposit>> byGroup = cashDepositRepository().findByDepositGroupIdIn(groupIds).stream()
                .collect(Collectors.groupingBy(CashDeposit::getDepositGroupId, LinkedHashMap::new, Collectors.toList()));
        for (CashDeposit deposit : deposits) {
            if (!StringUtils.hasText(deposit.getDepositGroupId()) || deposit.getParentDeposit() != null) {
                continue;
            }
            List<CashDeposit> group = byGroup.getOrDefault(deposit.getDepositGroupId(), List.of());
            boolean reversal = deposit.getReference() != null && deposit.getReference().startsWith("CANCEL-");
            List<CashDepositSliceDto> slices = new ArrayList<>();
            double extra = 0.0;
            for (CashDeposit line : group) {
                if (line.getParentDeposit() == null || line.getId() != null && line.getId().equals(deposit.getId())) {
                    continue;
                }
                boolean lineReversal = line.getReference() != null && line.getReference().startsWith("CANCEL-");
                if (lineReversal != reversal) {
                    continue;
                }
                slices.add(new CashDepositSliceDto(line.getDate(), line.getAmount()));
                extra += safe(line.getAmount());
            }
            if (!slices.isEmpty()) {
                deposit.setCatchupAllocations(slices);
                deposit.setPhysicalAmount(safe(deposit.getAmount()) + extra);
            }
        }
    }

    private boolean canCancel(User user) {
        return user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.SU);
    }

    private static String referenceOf(CashDeposit deposit) {
        if (deposit.getReference() != null && !deposit.getReference().isEmpty()) {
            return deposit.getReference();
        }
        return String.valueOf(deposit.getId());
    }

    private void applyDepositToReport(DailyCommercialReport report, double amount, double credit, double tontine,
            double newBalance, double surplus) {
        report.setTotalAmountDeposited(safe(report.getTotalAmountDeposited()) + amount);
        report.setTotalCreditAmountDeposited(safe(report.getTotalCreditAmountDeposited()) + credit);
        report.setTotalTontineAmountDeposited(safe(report.getTotalTontineAmountDeposited()) + tontine);
        report.setTotalNewBalanceAmountDeposited(safe(report.getTotalNewBalanceAmountDeposited()) + newBalance);
        report.setTotalSurplusAmountDeposited(safe(report.getTotalSurplusAmountDeposited()) + surplus);
    }

    private void assertDepositNotRemitted(CashDeposit deposit) {
        if (deposit.getRemittance() == null) {
            return;
        }
        RemittanceStatus status = deposit.getRemittance().getStatus();
        if (status == RemittanceStatus.RECEIVED) {
            throw new RuntimeException(
                    "Impossible d'annuler un versement déjà remis au gestionnaire.");
        }
        if (status == RemittanceStatus.PENDING) {
            throw new RuntimeException(
                    "Impossible d'annuler un versement inclus dans une remise en attente.");
        }
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }
}
