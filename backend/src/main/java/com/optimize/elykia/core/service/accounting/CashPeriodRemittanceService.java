package com.optimize.elykia.core.service.accounting;

import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.report.CashPeriodRemittanceDto;
import com.optimize.elykia.core.dto.report.CashPeriodRemittanceSummaryDto;
import com.optimize.elykia.core.entity.expense.Expense;
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
        PeriodTotals totals = computeTotals(year, month);
        CashPeriodRemittance existing = getRemittanceRepository()
                .findByYearAndMonth(year, month)
                .orElse(null);

        boolean isSecretary = currentUser.is(UserProfilConstant.SECRETARY);
        boolean isManager = currentUser.is(UserProfilConstant.GESTIONNAIRE);

        RemittanceStatus status = existing != null ? existing.getStatus() : null;
        boolean hasDeposits = totals.totalAmount() > 0;

        List<ExpenseDto> candidateExpenses = Collections.emptyList();
        List<ExpenseDto> linkedExpenses = Collections.emptyList();
        Double expenseAmount = 0.0;
        Double netAmount = totals.totalAmount();

        if (existing != null) {
            expenseAmount = existing.getExpenseAmount();
            netAmount = existing.getNetAmount();
            Set<Long> linkedIds = remittanceExpenseRepository.findExpenseIdsByRemittanceId(existing.getId());
            if (!linkedIds.isEmpty()) {
                linkedExpenses = expenseRepository.findAllById(linkedIds).stream()
                        .map(expenseMapper::toDto)
                        .collect(Collectors.toList());
            }
        } else {
            candidateExpenses = getCandidateExpenses(year, month);
        }

        return CashPeriodRemittanceSummaryDto.builder()
                .year(year)
                .month(month)
                .totalAmount(totals.totalAmount())
                .creditAmount(totals.creditAmount())
                .tontineAmount(totals.tontineAmount())
                .newBalanceAmount(totals.newBalanceAmount())
                .expenseAmount(expenseAmount)
                .netAmount(netAmount)
                .status(status)
                .remittanceId(existing != null ? existing.getId() : null)
                .canSubmit(isSecretary && existing == null && hasDeposits)
                .canAcknowledge(isManager && existing != null && existing.getStatus() == RemittanceStatus.PENDING)
                .canInitiate(isManager && existing == null && hasDeposits)
                .candidateExpenses(candidateExpenses)
                .linkedExpenses(linkedExpenses)
                .build();
    }

    public CashPeriodRemittanceDto submitBySecretary(int year, int month, List<Long> expenseIds) {
        User currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.SECRETARY)) {
            throw new RuntimeException("Seul le secrétaire peut soumettre une remise.");
        }
        assertNotExists(year, month);

        PeriodTotals totals = computeTotals(year, month);
        if (totals.totalAmount() <= 0) {
            throw new RuntimeException("Aucun versement enregistré pour cette période.");
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
        linkExpenses(remittance, expenses);

        return toDto(remittance);
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

        return toDto(remittance);
    }

    public CashPeriodRemittanceDto initiateByManager(int year, int month, List<Long> expenseIds) {
        User currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new RuntimeException("Seul le gestionnaire peut initier une réception.");
        }
        assertNotExists(year, month);

        PeriodTotals totals = computeTotals(year, month);
        if (totals.totalAmount() <= 0) {
            throw new RuntimeException("Aucun versement enregistré pour cette période.");
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
        linkExpenses(remittance, expenses);

        return toDto(remittance);
    }

    @Transactional(readOnly = true)
    public Page<CashPeriodRemittanceDto> list(Pageable pageable) {
        return repository.findAll(pageable).map(this::toDto);
    }

    // --- backward-compatible overloads ---

    public CashPeriodRemittanceDto submitBySecretary(int year, int month) {
        return submitBySecretary(year, month, Collections.emptyList());
    }

    public CashPeriodRemittanceDto acknowledgeByManager(Long id) {
        return acknowledgeByManager(id, null);
    }

    public CashPeriodRemittanceDto initiateByManager(int year, int month) {
        return initiateByManager(year, month, Collections.emptyList());
    }

    // --- helpers ---

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

    private void assertNotExists(int year, int month) {
        if (getRemittanceRepository().existsByYearAndMonth(year, month)) {
            throw new RuntimeException("Une remise existe déjà pour cette période.");
        }
    }

    private CashPeriodRemittance buildRemittance(int year, int month, PeriodTotals totals) {
        CashPeriodRemittance remittance = new CashPeriodRemittance();
        remittance.setYear(year);
        remittance.setMonth(month);
        remittance.setTotalAmount(totals.totalAmount());
        remittance.setCreditAmount(totals.creditAmount());
        remittance.setTontineAmount(totals.tontineAmount());
        remittance.setNewBalanceAmount(totals.newBalanceAmount());
        remittance.setReference("REM-" + year + "-" + String.format("%02d", month));
        return remittance;
    }

    private PeriodTotals computeTotals(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();

        List<Object[]> rows = cashDepositRepository.sumDepositsByPeriod(start, end);
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

    private static double toDouble(Object value) {
        if (value == null) return 0.0;
        if (value instanceof Number number) return number.doubleValue();
        return 0.0;
    }

    private CashPeriodRemittanceDto toDto(CashPeriodRemittance entity) {
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
                .build();
    }

    private CashPeriodRemittanceRepository getRemittanceRepository() {
        return (CashPeriodRemittanceRepository) repository;
    }

    private record PeriodTotals(double totalAmount, double creditAmount, double tontineAmount,
            double newBalanceAmount) {
    }
}
