package com.optimize.elykia.finance.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.finance.web.dto.ExpenseTypeDto;
import com.optimize.elykia.finance.domain.ExpenseType;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ExpenseTypeMapper extends BaseMapper<ExpenseType, ExpenseTypeDto> {
}
