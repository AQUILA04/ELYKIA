package com.optimize.elykia.finance.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.finance.web.dto.ExpenseDto;
import com.optimize.elykia.finance.domain.Expense;
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
