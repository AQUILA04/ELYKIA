package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.ExpenseTypeDto;
import com.optimize.elykia.core.entity.expense.ExpenseType;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ExpenseTypeMapper extends BaseMapper<ExpenseType, ExpenseTypeDto> {
}
