package com.optimize.elykia.core.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.core.dto.MobileTransactionDto;
import com.optimize.elykia.core.entity.MobileTransaction;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TransactionMapper extends BaseMapper<MobileTransaction, MobileTransactionDto> {
}
