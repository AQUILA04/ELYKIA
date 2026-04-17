package com.optimize.elykia.core.mapper;

import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.dto.TontineDeliveryItemDto;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TontineDeliveryMapper {
    
    @Mapping(source = "tontineMember.id", target = "tontineMemberId")
    @Mapping(source = "tontineMember.client.fullName", target = "clientName")
    @Mapping(source = "tontineMember.deliveryStatus", target = "deliveryStatus")
    TontineDeliveryDto toDto(TontineDelivery delivery);
    
    TontineDeliveryItemDto toItemDto(TontineDeliveryItem item);
}
