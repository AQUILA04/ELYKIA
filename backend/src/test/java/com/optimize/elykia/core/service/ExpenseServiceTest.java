package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.dto.ExpenseKpiDto;
import com.optimize.elykia.core.entity.expense.Expense;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import com.optimize.elykia.core.mapper.ExpenseMapper;
import com.optimize.elykia.core.repository.ExpenseRepository;
import com.optimize.elykia.core.repository.ExpenseTypeRepository;
import com.optimize.elykia.core.service.expense.ExpenseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock
    private ExpenseRepository expenseRepository;

    @Mock
    private ExpenseTypeRepository expenseTypeRepository;

    @Mock
    private ExpenseMapper expenseMapper;

    @InjectMocks
    private ExpenseService expenseService;

    private Expense expense;
    private ExpenseDto expenseDto;
    private ExpenseType expenseType;

    @BeforeEach
    void setUp() {
        expenseType = new ExpenseType();
        expenseType.setId(1L);
        expenseType.setName("Test Type");

        expense = new Expense();
        expense.setId(1L);
        expense.setAmount(BigDecimal.TEN);
        expense.setExpenseDate(LocalDate.now());
        expense.setExpenseType(expenseType);

        expenseDto = new ExpenseDto();
        expenseDto.setId(1L);
        expenseDto.setAmount(BigDecimal.TEN);
        expenseDto.setExpenseTypeId(1L);
    }

    @Test
    void createExpense_ShouldReturnCreatedExpenseDto() {
        when(expenseMapper.toEntity(any(ExpenseDto.class))).thenReturn(expense);
        when(expenseTypeRepository.findById(1L)).thenReturn(Optional.of(expenseType));
        when(expenseRepository.save(any(Expense.class))).thenReturn(expense);
        when(expenseMapper.toDto(any(Expense.class))).thenReturn(expenseDto);

        ExpenseDto created = expenseService.createExpense(expenseDto);

        assertThat(created).isNotNull();
        assertThat(created.getAmount()).isEqualTo(BigDecimal.TEN);
        verify(expenseRepository, times(1)).save(any(Expense.class));
    }

    @Test
    void updateExpense_ShouldReturnUpdatedExpenseDto() {
        when(expenseMapper.toEntity(any(ExpenseDto.class))).thenReturn(expense);
        // In updateExpense logic: 
        // if (dto.getExpenseTypeId() != null) findById...
        when(expenseTypeRepository.findById(1L)).thenReturn(Optional.of(expenseType));
        
        when(expenseRepository.saveAndFlush(any(Expense.class))).thenReturn(expense);
        when(expenseMapper.toDto(any(Expense.class))).thenReturn(expenseDto);

        ExpenseDto updated = expenseService.updateExpense(expenseDto, 1L);

        assertThat(updated).isNotNull();
        verify(expenseRepository, times(1)).saveAndFlush(any(Expense.class));
    }

    @Test
    void getKpi_ShouldReturnCorrectTotal() {
        LocalDate start = LocalDate.now().minusDays(1);
        LocalDate end = LocalDate.now();
        when(expenseRepository.getTotalAmountByPeriod(start, end)).thenReturn(BigDecimal.valueOf(100));

        ExpenseKpiDto kpi = expenseService.getKpi(start, end);

        assertThat(kpi).isNotNull();
        assertThat(kpi.getTotalAmount()).isEqualTo(BigDecimal.valueOf(100));
        assertThat(kpi.getStartDate()).isEqualTo(start);
        assertThat(kpi.getEndDate()).isEqualTo(end);
    }
    
    @Test
    void getDashboardKpis_ShouldReturnTwoKpis() {
        // Mocking behavior for internal calls or repository calls
        // getDashboardKpis calls getKpi twice (This Week, This Month)
        // getKpi calls repository.getTotalAmountByPeriod
        
        when(expenseRepository.getTotalAmountByPeriod(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(BigDecimal.valueOf(50));

        List<ExpenseKpiDto> kpis = expenseService.getDashboardKpis();

        assertThat(kpis).hasSize(2); // Week + Month
        assertThat(kpis.get(0).getPeriodLabel()).isEqualTo("Cette Semaine");
        assertThat(kpis.get(1).getPeriodLabel()).isEqualTo("Ce Mois");
    }
}
