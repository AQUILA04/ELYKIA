package com.optimize.elykia.client.mapper;

import com.optimize.common.entities.mapper.BaseMapper;
import com.optimize.elykia.client.dto.ClientDto;
import com.optimize.elykia.client.entity.Client;
import jakarta.xml.bind.DatatypeConverter;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.boot.autoconfigure.jackson.JacksonProperties;
import org.springframework.util.StringUtils;

@Mapper(componentModel = "spring")
public interface ClientMapper extends BaseMapper<Client, ClientDto> {
    default byte[] stringToBytes(String strBase64) {
        if (StringUtils.hasText(strBase64)) {
            return DatatypeConverter.parseBase64Binary(strBase64);
        }
        return new byte[0];
    }

    default String bytesToString(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        return DatatypeConverter.printBase64Binary(bytes);
    }

    @Override
    @Mapping(target = "IDDoc", expression = "java(stringToBytes(dto.getIDDoc()))")
    @Mapping(target = "profilPhoto", expression = "java(stringToBytes(dto.getProfilPhoto()))")
    Client toEntity(ClientDto dto);

    @Override
    @Mapping(target = "IDDoc", expression = "java(bytesToString(entity.getIDDoc()))")
    @Mapping(target = "profilPhoto", expression = "java(bytesToString(entity.getProfilPhoto()))")
    ClientDto toDto(Client entity);
}
