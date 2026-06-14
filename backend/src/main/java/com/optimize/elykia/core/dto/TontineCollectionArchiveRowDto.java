package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.tontine.TontineCollection;

import java.time.LocalDateTime;

public record TontineCollectionArchiveRowDto(
        String clientName,
        String clientCode,
        String quarter,
        String tontineCollector,
        Double amount,
        LocalDateTime collectionDate,
        String recordedBy,
        Boolean isDeliveryCollection,
        String reference
) {
    public static TontineCollectionArchiveRowDto from(TontineCollection collection) {
        var client = collection.getTontineMember().getClient();
        String collector = client.getTontineCollector() != null ? client.getTontineCollector() : "N/A";
        String quarter = client.getQuarter() != null ? client.getQuarter() : "N/A";
        return new TontineCollectionArchiveRowDto(
                client.getFullName(),
                client.getCode(),
                quarter,
                collector,
                collection.getAmount(),
                collection.getCollectionDate(),
                collection.getCommercialUsername(),
                collection.getIsDeliveryCollection(),
                collection.getReference()
        );
    }
}
