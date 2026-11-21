package com.optimize.elykia.bootstrap.web.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.bootstrap.web.dto.MobileTransactionDto;
import com.optimize.elykia.bootstrap.domain.MobileTransaction;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TransactionMapper extends BaseMapper<MobileTransaction, MobileTransactionDto> {
}
