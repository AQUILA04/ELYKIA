package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.report.CashDepositDto;
import com.optimize.elykia.core.dto.report.CashPeriodRemittanceDto;
import com.optimize.elykia.core.dto.report.CashPeriodRemittanceSummaryDto;
import com.optimize.elykia.core.entity.expense.Expense;
import com.optimize.elykia.core.entity.report.CashDeposit;
import com.optimize.elykia.core.entity.report.CashPeriodRemittance;
import com.optimize.elykia.core.entity.report.CashPeriodRemittanceExpense;
import com.optimize.elykia.core.enumaration.RemittanceInitiator;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import com.optimize.elykia.core.mapper.ExpenseMapper;
import com.optimize.elykia.core.repository.CashDepositRepository;
import com.optimize.elykia.core.repository.CashPeriodRemittanceExpenseRepository;
import com.optimize.elykia.core.repository.CashPeriodRemittanceRepository;
import com.optimize.elykia.core.repository.ExpenseRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class CashPeriodRemittanceService extends GenericService<CashPeriodRemittance, Long> {

    private final CashDepositRepository cashDepositRepository;
    private final CashPeriodRemittanceExpenseRepository remittanceExpenseRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseMapper expenseMapper;
    private final UserService userService;

    public CashPeriodRemittanceService(
            CashPeriodRemittanceRepository repository,
            CashDepositRepository cashDepositRepository,
            CashPeriodRemittanceExpenseRepository remittanceExpenseRepository,
            ExpenseRepository expenseRepository,
            ExpenseMapper expenseMapper,
            UserService userService) {
        super(repository);
        this.cashDepositRepository = cashDepositRepository;
        this.remittanceExpenseRepository = remittanceExpenseRepository;
        this.expenseRepository = expenseRepository;
        this.expenseMapper = expenseMapper;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public CashPeriodRemittanceSummaryDto getSummary(int year, int month) {
        User currentUser = userService.getCurrentUser();
        PeriodTotals unremittedTotals = computeUnremittedTotals(year, month);
        CashPeriodRemittance pending = getRemittanceRepository()
                .findByYearAndMonthAndStatus(year, month, RemittanceStatus.PENDING)
                .orElse(null);
        double alreadyRemittedAmount = safe(getRemittanceRepository().sumReceivedTotalByYearAndMonth(year, month));

        boolean isSecretary = currentUser.is(UserProfilConstant.SECRETARY);
        boolean isManager = currentUser.is(UserProfilConstant.GESTIONNAIRE);
        boolean hasUnremitted = unremittedTotals.totalAmount() > 0;

        RemittanceStatus status = null;
        Long remittanceId = null;
        double displayTotal = unremittedTotals.totalAmount();
        double displayCredit = unremittedTotals.creditAmount();
        double displayTontine = unremittedTotals.tontineAmount();
        double displayNewBalance = unremittedTotals.newBalanceAmount();
        double expenseAmount = 0.0;
        double netAmount = unremittedTotals.totalAmount();
        List<ExpenseDto> candidateExpenses = Collections.emptyList();
        List<ExpenseDto> linkedExpenses = Collections.emptyList();
        boolean canSubmit = false;
        boolean canAcknowledge = false;
        boolean canInitiate = false;

        if (pending != null) {
            status = RemittanceStatus.PENDING;
            remittanceId = pending.getId();
            displayTotal = pending.getTotalAmount();
            displayCredit = pending.getCreditAmount();
            displayTontine = pending.getTontineAmount();
            displayNewBalance = pending.getNewBalanceAmount();
            expenseAmount = pending.getExpenseAmount();
            netAmount = pending.getNetAmount();
            linkedExpenses = loadLinkedExpenses(pending.getId());
            canAcknowledge = isManager;
        } else if (hasUnremitted) {
            candidateExpenses = getCandidateExpenses(year, month);
            canSubmit = isSecretary;
            canInitiate = isManager;
        } else if (alreadyRemittedAmount > 0) {
            status = RemittanceStatus.RECEIVED;
        }

        return CashPeriodRemittanceSummaryDto.builder()
                .year(year)
                .month(month)
                .totalAmount(displayTotal)
                .creditAmount(displayCredit)
                .tontineAmount(displayTontine)
                .newBalanceAmount(displayNewBalance)
                .expenseAmount(expenseAmount)
                .netAmount(netAmount)
                .status(status)
                .remittanceId(remittanceId)
                .canSubmit(canSubmit)
                .canAcknowledge(canAcknowledge)
                .canInitiate(canInitiate)
                .candidateExpenses(candidateExpenses)
                .linkedExpenses(linkedExpenses)
                .alreadyRemittedAmount(alreadyRemittedAmount)
                .build();
    }

    public CashPeriodRemittanceDto submitBySecretary(int year, int month, List<Long> expenseIds) {
        User currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.SECRETARY)) {
            throw new RuntimeException("Seul le secrétaire peut soumettre une remise.");
        }
        assertNoPendingRemittance(year, month);

        List<CashDeposit> unremittedDeposits = loadUnremittedDeposits(year, month);
        PeriodTotals totals = totalsFromDeposits(unremittedDeposits);
        if (totals.totalAmount() <= 0) {
            throw new RuntimeException("Aucun versement en attente de remise pour cette période.");
        }

        List<Expense> expenses = resolveAndValidateExpenses(expenseIds);
        double expenseAmount = computeExpenseAmount(expenses);
        double netAmount = totals.totalAmount() - expenseAmount;
        if (netAmount < 0) {
            throw new RuntimeException("Le montant des dépenses dépasse le total versé.");
        }

        CashPeriodRemittance remittance = buildRemittance(year, month, totals);
        remittance.setExpenseAmount(expenseAmount);
        remittance.setNetAmount(netAmount);
        remittance.setStatus(RemittanceStatus.PENDING);
        remittance.setInitiatedBy(RemittanceInitiator.SECRETARY);
        remittance.setSubmittedBy(currentUser.getUsername());
        remittance.setSubmittedAt(LocalDateTime.now());

        remittance = getRemittanceRepository().save(remittance);
        linkDeposits(unremittedDeposits, remittance);
        linkExpenses(remittance, expenses);

        return toDto(remittance, toDepositDtos(unremittedDeposits));
    }

    public CashPeriodRemittanceDto acknowledgeByManager(Long id, List<Long> expenseIds) {
        User currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new RuntimeException("Seul le gestionnaire peut accuser réception.");
        }

        CashPeriodRemittance remittance = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Remise introuvable."));
        if (remittance.getStatus() != RemittanceStatus.PENDING) {
            throw new RuntimeException("Cette remise n'est pas en attente d'accusé de réception.");
        }

        Set<Long> currentLinkedIds = remittanceExpenseRepository.findExpenseIdsByRemittanceId(id);
        Set<Long> finalIds = expenseIds != null ? new HashSet<>(expenseIds) : currentLinkedIds;

        if (!currentLinkedIds.containsAll(finalIds)) {
            throw new RuntimeException("Impossible d'ajouter des dépenses non liées initialement.");
        }

        remittanceExpenseRepository.deleteByRemittanceId(id);

        List<Expense> finalExpenses = finalIds.isEmpty()
                ? Collections.emptyList()
                : expenseRepository.findAllById(finalIds);
        double expenseAmount = computeExpenseAmount(finalExpenses);
        double netAmount = remittance.getTotalAmount() - expenseAmount;
        if (netAmount < 0) {
            throw new RuntimeException("Le montant des dépenses dépasse le total versé.");
        }

        remittance.setExpenseAmount(expenseAmount);
        remittance.setNetAmount(netAmount);
        remittance.setStatus(RemittanceStatus.RECEIVED);
        remittance.setReceivedBy(currentUser.getUsername());
        remittance.setReceivedAt(LocalDateTime.now());

        remittance = repository.save(remittance);
        linkExpenses(remittance, finalExpenses);

        return toDto(remittance, loadDepositsForRemittance(id));
    }

    public CashPeriodRemittanceDto initiateByManager(int year, int month, List<Long> expenseIds) {
        User currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new RuntimeException("Seul le gestionnaire peut initier une réception.");
        }
        assertNoPendingRemittance(year, month);

        List<CashDeposit> unremittedDeposits = loadUnremittedDeposits(year, month);
        PeriodTotals totals = totalsFromDeposits(unremittedDeposits);
        if (totals.totalAmount() <= 0) {
            throw new RuntimeException("Aucun versement en attente de remise pour cette période.");
        }

        List<Expense> expenses = resolveAndValidateExpenses(expenseIds);
        double expenseAmount = computeExpenseAmount(expenses);
        double netAmount = totals.totalAmount() - expenseAmount;
        if (netAmount < 0) {
            throw new RuntimeException("Le montant des dépenses dépasse le total versé.");
        }

        CashPeriodRemittance remittance = buildRemittance(year, month, totals);
        remittance.setExpenseAmount(expenseAmount);
        remittance.setNetAmount(netAmount);
        remittance.setStatus(RemittanceStatus.RECEIVED);
        remittance.setInitiatedBy(RemittanceInitiator.MANAGER);
        remittance.setSubmittedBy(currentUser.getUsername());
        remittance.setSubmittedAt(LocalDateTime.now());
        remittance.setReceivedBy(currentUser.getUsername());
        remittance.setReceivedAt(LocalDateTime.now());

        remittance = getRemittanceRepository().save(remittance);
        linkDeposits(unremittedDeposits, remittance);
        linkExpenses(remittance, expenses);

        return toDto(remittance, toDepositDtos(unremittedDeposits));
    }

    @Transactional(readOnly = true)
    public Page<CashPeriodRemittanceDto> list(Pageable pageable) {
        Page<CashPeriodRemittance> page = repository.findAll(pageable);
        List<Long> remittanceIds = page.getContent().stream()
                .map(CashPeriodRemittance::getId)
                .toList();
        Map<Long, List<CashDepositDto>> depositsByRemittance = loadDepositsByRemittanceIds(remittanceIds);
        return page.map(remittance -> toDto(remittance,
                depositsByRemittance.getOrDefault(remittance.getId(), Collections.emptyList())));
    }

    public CashPeriodRemittanceDto submitBySecretary(int year, int month) {
        return submitBySecretary(year, month, Collections.emptyList());
    }

    public CashPeriodRemittanceDto acknowledgeByManager(Long id) {
        return acknowledgeByManager(id, null);
    }

    public CashPeriodRemittanceDto initiateByManager(int year, int month) {
        return initiateByManager(year, month, Collections.emptyList());
    }

    private List<ExpenseDto> loadLinkedExpenses(Long remittanceId) {
        Set<Long> linkedIds = remittanceExpenseRepository.findExpenseIdsByRemittanceId(remittanceId);
        if (linkedIds.isEmpty()) {
            return Collections.emptyList();
        }
        return expenseRepository.findAllById(linkedIds).stream()
                .map(expenseMapper::toDto)
                .collect(Collectors.toList());
    }

    private List<ExpenseDto> getCandidateExpenses(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();

        Set<Long> alreadyLinked = remittanceExpenseRepository.findAllLinkedExpenseIds();

        return expenseRepository.findByExpenseDateBetween(start, end).stream()
                .filter(e -> !alreadyLinked.contains(e.getId()))
                .map(expenseMapper::toDto)
                .collect(Collectors.toList());
    }

    private List<Expense> resolveAndValidateExpenses(List<Long> expenseIds) {
        if (expenseIds == null || expenseIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<Expense> expenses = expenseRepository.findAllById(expenseIds);
        if (expenses.size() != expenseIds.size()) {
            throw new RuntimeException("Certaines dépenses sont introuvables.");
        }
        Set<Long> idsSet = new HashSet<>(expenseIds);
        Set<Long> alreadyLinked = remittanceExpenseRepository.findAllLinkedExpenseIds();
        for (Long id : idsSet) {
            if (alreadyLinked.contains(id)) {
                throw new RuntimeException("La dépense #" + id + " est déjà associée à une remise.");
            }
        }
        return expenses;
    }

    private double computeExpenseAmount(List<Expense> expenses) {
        return expenses.stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .doubleValue();
    }

    private void linkExpenses(CashPeriodRemittance remittance, List<Expense> expenses) {
        for (Expense expense : expenses) {
            CashPeriodRemittanceExpense link = new CashPeriodRemittanceExpense();
            link.setRemittance(remittance);
            link.setExpense(expense);
            remittanceExpenseRepository.save(link);
        }
    }

    private void linkDeposits(List<CashDeposit> deposits, CashPeriodRemittance remittance) {
        for (CashDeposit deposit : deposits) {
            deposit.setRemittance(remittance);
            cashDepositRepository.save(deposit);
        }
    }

    private void assertNoPendingRemittance(int year, int month) {
        if (getRemittanceRepository().existsByYearAndMonthAndStatus(year, month, RemittanceStatus.PENDING)) {
            throw new RuntimeException("Une remise est déjà en attente pour cette période.");
        }
    }

    private List<CashDeposit> loadUnremittedDeposits(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        return cashDepositRepository.findUnremittedDepositsByPeriod(
                yearMonth.atDay(1),
                yearMonth.atEndOfMonth());
    }

    private CashPeriodRemittance buildRemittance(int year, int month, PeriodTotals totals) {
        CashPeriodRemittance remittance = new CashPeriodRemittance();
        remittance.setYear(year);
        remittance.setMonth(month);
        remittance.setTotalAmount(totals.totalAmount());
        remittance.setCreditAmount(totals.creditAmount());
        remittance.setTontineAmount(totals.tontineAmount());
        remittance.setNewBalanceAmount(totals.newBalanceAmount());
        remittance.setReference("REM-" + year + "-" + String.format("%02d", month) + "-" + System.currentTimeMillis());
        return remittance;
    }

    private PeriodTotals computeUnremittedTotals(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        return readPeriodTotals(cashDepositRepository.sumUnremittedDepositsByPeriod(
                yearMonth.atDay(1),
                yearMonth.atEndOfMonth()));
    }

    private PeriodTotals totalsFromDeposits(List<CashDeposit> deposits) {
        double total = 0;
        double credit = 0;
        double tontine = 0;
        double newBalance = 0;
        for (CashDeposit deposit : deposits) {
            total += safe(deposit.getAmount());
            credit += safe(deposit.getCreditAmount() != null ? deposit.getCreditAmount() : deposit.getAmount());
            tontine += safe(deposit.getTontineAmount());
            newBalance += safe(deposit.getNewBalanceAmount());
        }
        return new PeriodTotals(total, credit, tontine, newBalance);
    }

    private PeriodTotals readPeriodTotals(List<Object[]> rows) {
        if (rows == null || rows.isEmpty() || rows.get(0) == null) {
            return new PeriodTotals(0, 0, 0, 0);
        }
        Object[] values = rows.get(0);
        return new PeriodTotals(
                toDouble(values[0]),
                toDouble(values[1]),
                toDouble(values[2]),
                toDouble(values[3]));
    }

    private static double safe(Double value) {
        return value != null ? value : 0.0;
    }

    private static double toDouble(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Number number) return number.doubleValue();
        return 0.0;
    }

    private CashPeriodRemittanceDto toDto(CashPeriodRemittance entity, List<CashDepositDto> deposits) {
        return CashPeriodRemittanceDto.builder()
                .id(entity.getId())
                .year(entity.getYear())
                .month(entity.getMonth())
                .totalAmount(entity.getTotalAmount())
                .creditAmount(entity.getCreditAmount())
                .tontineAmount(entity.getTontineAmount())
                .newBalanceAmount(entity.getNewBalanceAmount())
                .expenseAmount(entity.getExpenseAmount())
                .netAmount(entity.getNetAmount())
                .status(entity.getStatus())
                .initiatedBy(entity.getInitiatedBy())
                .submittedBy(entity.getSubmittedBy())
                .receivedBy(entity.getReceivedBy())
                .submittedAt(entity.getSubmittedAt())
                .receivedAt(entity.getReceivedAt())
                .reference(entity.getReference())
                .deposits(deposits)
                .build();
    }

    private List<CashDepositDto> loadDepositsForRemittance(Long remittanceId) {
        return loadDepositsByRemittanceIds(List.of(remittanceId))
                .getOrDefault(remittanceId, Collections.emptyList());
    }

    private Map<Long, List<CashDepositDto>> loadDepositsByRemittanceIds(List<Long> remittanceIds) {
        if (remittanceIds == null || remittanceIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return cashDepositRepository
                .findByRemittanceIdInOrderByRemittanceIdAscCommercialUsernameAscDateAscIdAsc(remittanceIds)
                .stream()
                .collect(Collectors.groupingBy(
                        deposit -> deposit.getRemittance().getId(),
                        LinkedHashMap::new,
                        Collectors.mapping(this::toDepositDto, Collectors.toList())));
    }

    private List<CashDepositDto> toDepositDtos(List<CashDeposit> deposits) {
        return deposits.stream().map(this::toDepositDto).collect(Collectors.toList());
    }

    private CashDepositDto toDepositDto(CashDeposit deposit) {
        CashDepositDto dto = new CashDepositDto();
        dto.setId(deposit.getId());
        dto.setDate(deposit.getDate());
        dto.setCommercialUsername(deposit.getCommercialUsername());
        dto.setAmount(deposit.getAmount());
        dto.setCreditAmount(deposit.getCreditAmount());
        dto.setTontineAmount(deposit.getTontineAmount());
        dto.setNewBalanceAmount(deposit.getNewBalanceAmount());
        dto.setSurplusAmount(deposit.getSurplusAmount());
        dto.setReference(deposit.getReference());
        dto.setReceivedBy(deposit.getReceivedBy());
        return dto;
    }

    private CashPeriodRemittanceRepository getRemittanceRepository() {
        return (CashPeriodRemittanceRepository) repository;
    }

    private record PeriodTotals(double totalAmount, double creditAmount, double tontineAmount,
            double newBalanceAmount) {
    }
}
