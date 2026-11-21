package com.optimize.elykia.tontine.web.mapper;

import com.optimize.elykia.tontine.web.dto.TontineDeliveryDto;
import com.optimize.elykia.tontine.web.dto.TontineDeliveryItemDto;
import com.optimize.elykia.tontine.domain.TontineDelivery;
import com.optimize.elykia.tontine.domain.TontineDeliveryItem;
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
