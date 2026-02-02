package com.optimize.elykia.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToOne;
import lombok.ToString;

import java.time.LocalDate;
import java.util.Objects;

public record ClientRespDto(Long id,
        String firstname,
        String lastname,
        String address,
        String phone,
        String cardID,
        String cardType,
        LocalDate dateOfBirth,
        String contactPersonName,
        String contactPersonPhone,
        String contactPersonAddress,
        String collector,
        String quarter,
        Boolean creditInProgress,
        String occupation,
        ClientType clientType,
        Double latitude,
        Double longitude,
        String mll,
        LocalDate syncDate,
        String code, String profilPhotoUrl, String cardPhotoUrl,
                            String tontineCollector

) {

    @JsonIgnore
    public static ClientRespDto fromId(Long id) {
        return new ClientRespDto(id, null, null, null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null, null, null,
                null, null, null, null, null);
    }

    @JsonIgnore
    public static ClientRespDto fromClient(Client client) {
        if (Objects.isNull(client)) {
            return  null;
        }
        return new ClientRespDto(client.getId(), client.getFirstname(), client.getLastname(), client.getAddress(), client.getPhone(), client.getCardID(), client.getCardType(),
                client.getDateOfBirth(), null, null, null, client.getCollector(),
                client.getQuarter(), client.getCreditInProgress(), client.getOccupation(), client.getClientType(), null, null, null,
                null, null, null, null, null);
    }
}
