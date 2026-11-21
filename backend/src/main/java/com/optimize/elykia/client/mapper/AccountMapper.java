package com.optimize.elykia.client.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.client.dto.AccountDto;
import com.optimize.elykia.client.entity.Account;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AccountMapper extends BaseMapper<Account, AccountDto> {
    @Override
    @Mapping(target = "client.id", source = "clientId")
    Account toEntity(AccountDto dto);
}
