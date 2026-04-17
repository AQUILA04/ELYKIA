package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.entity.expense.Expense;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ExpenseMapper extends BaseMapper<Expense, ExpenseDto> {
    @Mapping(source = "expenseType.id", target = "expenseTypeId")
    @Mapping(source = "expenseType.name", target = "expenseTypeName")
    ExpenseDto toDto(Expense entity);

    @Mapping(source = "expenseTypeId", target = "expenseType.id")
    Expense toEntity(ExpenseDto dto);
}
