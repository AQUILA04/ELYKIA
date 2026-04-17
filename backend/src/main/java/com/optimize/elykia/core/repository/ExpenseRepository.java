package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.expense.Expense;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ExpenseRepository extends GenericRepository<Expense, Long> {

    @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.expenseDate BETWEEN :startDate AND :endDate")
    BigDecimal getTotalAmountByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    List<Expense> findByExpenseDateBetween(LocalDate startDate, LocalDate endDate);
}
