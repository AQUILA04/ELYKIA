package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.TontineCollection;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

public record TontineCollectionRespDto(Long id, TontineMemberRespDto tontineMember, Double amount,
                                       LocalDateTime collectionDate, String commercialUsername,
                                       Boolean isDeliveryCollection, String reference) {

    public static TontineCollectionRespDto fromId(Long id) {
        if (id == null) {
            return null;
        }
        return new TontineCollectionRespDto(id, null, null, null, null, null, null);
    }

    public static TontineCollectionRespDto fromTontineCollection(TontineCollection tontineCollection) {
        if (tontineCollection == null) {
            return null;
        }
        return new TontineCollectionRespDto(tontineCollection.getId(),
                TontineMemberRespDto.fromId(tontineCollection.getTontineMember().getId()),
                tontineCollection.getAmount(),
                tontineCollection.getCollectionDate(),
                tontineCollection.getCommercialUsername(),
                tontineCollection.getIsDeliveryCollection(),
                tontineCollection.getReference());
    }

    public static List<TontineCollectionRespDto> fromList(List<TontineCollection> tontineCollections) {
        if (tontineCollections == null) {
            return null;
        }
        return tontineCollections.stream().map(TontineCollectionRespDto::fromTontineCollection).toList();
    }

    public static Page<TontineCollectionRespDto> fromPage(Page<TontineCollection> tontineCollections) {
        if (tontineCollections == null) {
            return null;
        }
        return tontineCollections.map(TontineCollectionRespDto::fromTontineCollection);
    }
}
