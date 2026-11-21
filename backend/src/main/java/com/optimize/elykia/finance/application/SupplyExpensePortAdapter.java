package com.optimize.elykia.finance.application;

import com.optimize.elykia.finance.web.dto.ExpenseDto;
import com.optimize.elykia.finance.domain.ExpenseType;
import com.optimize.elykia.finance.infrastructure.persistence.ExpenseTypeRepository;
import com.optimize.elykia.inventory.api.SupplyExpensePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Adaptateur SPI liant le module {@code inventory} à la comptabilisation des dépenses d'approvisionnement.
 */
@Component
@RequiredArgsConstructor
public class SupplyExpensePortAdapter implements SupplyExpensePort {

    private final ExpenseService expenseService;
    private final ExpenseTypeRepository expenseTypeRepository;

    @Override
    public void recordSupplyExpense(double amount, LocalDate expenseDate, String description, String reference) {
        ExpenseType expenseType = expenseTypeRepository.findByName("Approvisionnement")
                .orElseThrow(() -> new RuntimeException("Expense Type 'Approvisionnement' not found"));

        ExpenseDto expenseDto = new ExpenseDto();
        expenseDto.setExpenseTypeId(expenseType.getId());
        expenseDto.setAmount(BigDecimal.valueOf(amount));
        expenseDto.setExpenseDate(expenseDate);
        expenseDto.setDescription(description);
        expenseDto.setReference(reference);

        expenseService.createExpense(expenseDto);
    }
}
