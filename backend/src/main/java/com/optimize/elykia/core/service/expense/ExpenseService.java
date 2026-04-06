package com.optimize.elykia.core.service.expense;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.ExpenseKpiDto;
import com.optimize.elykia.core.entity.expense.Expense;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import com.optimize.elykia.core.mapper.ExpenseMapper;
import com.optimize.elykia.core.repository.ExpenseRepository;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@Slf4j
public class ExpenseService extends GenericService<Expense, Long> {

    private final ExpenseTypeRepository expenseTypeRepository;
    private final ExpenseMapper expenseMapper;

    public ExpenseService(ExpenseRepository repository, ExpenseTypeRepository expenseTypeRepository, ExpenseMapper expenseMapper) {
        super(repository);
        this.expenseTypeRepository = expenseTypeRepository;
        this.expenseMapper = expenseMapper;
    }

    @Transactional
    public ExpenseDto createExpense(ExpenseDto dto) {
        Expense expense = expenseMapper.toEntity(dto);
        
        ExpenseType expenseType = expenseTypeRepository.findById(dto.getExpenseTypeId())
                .orElseThrow(() -> new RuntimeException("Expense Type not found"));
        expense.setExpenseType(expenseType);
        
        expense = create(expense);
        
        return expenseMapper.toDto(expense);
    }

    @Transactional
    public ExpenseDto updateExpense(ExpenseDto dto, Long id) {
        // GenericService update usually expects entity with ID.
        // We might need to fetch existing to set ExpenseType if not in DTO fully or handle relations.
        // But mapper + set ID should work for simple update if GenericService.update merges.
        // However, we explicitly want to handle ExpenseType update.
        
        dto.setId(id);
        Expense expense = expenseMapper.toEntity(dto);
        
        if (dto.getExpenseTypeId() != null) {
             ExpenseType expenseType = expenseTypeRepository.findById(dto.getExpenseTypeId())
                .orElseThrow(() -> new RuntimeException("Expense Type not found"));
             expense.setExpenseType(expenseType);
        }

        expense = update(expense);
        return expenseMapper.toDto(expense);
    }

    public ExpenseDto getByIdDto(Long id) {
        return expenseMapper.toDto(getById(id));
    }

    public Page<ExpenseDto> getAllDto(Pageable pageable) {
        return getAll(pageable).map(expenseMapper::toDto);
    }

    public List<ExpenseDto> getExpensesByPeriod(LocalDate startDate, LocalDate endDate) {
        return getRepository().findByExpenseDateBetween(startDate, endDate).stream()
                .map(expenseMapper::toDto)
                .collect(Collectors.toList());
    }

    public ExpenseKpiDto getKpi(LocalDate startDate, LocalDate endDate) {
        BigDecimal total = getRepository().getTotalAmountByPeriod(startDate, endDate);
        if (total == null) {
            total = BigDecimal.ZERO;
        }
        return ExpenseKpiDto.builder()
                .startDate(startDate)
                .endDate(endDate)
                .totalAmount(total)
                .build();
    }
    
    public List<ExpenseKpiDto> getDashboardKpis() {
        List<ExpenseKpiDto> kpis = new ArrayList<>();
        
        LocalDate now = LocalDate.now();
        
        // This Week
        LocalDate startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = now.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        ExpenseKpiDto weekKpi = getKpi(startOfWeek, endOfWeek);
        weekKpi.setPeriodLabel("Cette Semaine");
        kpis.add(weekKpi);
        
        // This Month
        LocalDate startOfMonth = now.with(TemporalAdjusters.firstDayOfMonth());
        LocalDate endOfMonth = now.with(TemporalAdjusters.lastDayOfMonth());
        ExpenseKpiDto monthKpi = getKpi(startOfMonth, endOfMonth);
        monthKpi.setPeriodLabel("Ce Mois");
        kpis.add(monthKpi);
        
        return kpis;
    }
    
    @Override
    public ExpenseRepository getRepository() {
        return (ExpenseRepository) super.getRepository();
    }
}
