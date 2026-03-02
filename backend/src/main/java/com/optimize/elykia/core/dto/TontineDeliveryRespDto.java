package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.TontineDelivery;
import com.optimize.elykia.core.entity.TontineDeliveryItem;

import java.time.LocalDateTime;
import java.util.List;

public record TontineDeliveryRespDto(Long id,
                                     TontineMemberRespDto tontineMember,
                                     LocalDateTime deliveryDate,
                                     LocalDateTime requestDate,
                                     Double totalAmount,
                                     Double remainingBalance,
                                     String commercialUsername,
                                     List<TontineDeliveryItemRespDto> items) {

    public static TontineDeliveryRespDto fromId(Long id) {
        if (id == null) {
            return null;
        }
        return new TontineDeliveryRespDto(id, null, null, null, null, null, null, null);
    }

    public static TontineDeliveryRespDto fromTontineDelivery(TontineDelivery delivery) {
        if (delivery == null) {
            return null;
        }
        return new TontineDeliveryRespDto(delivery.getId(),
                TontineMemberRespDto.fromId(delivery.getTontineMember().getId()),
                delivery.getDeliveryDate(),
                delivery.getRequestDate(),
                delivery.getTotalAmount(),
                delivery.getRemainingBalance(),
                delivery.getCommercialUsername(),
                TontineDeliveryItemRespDto.fromDeliveryItems(delivery.getItems()));
    }
}
