package com.optimize.elykia.client.dto;

import com.optimize.elykia.client.enumeration.AccountStatus;

import java.util.Objects;

public record AccountRespDto (Long id,
                              String accountNumber,
                              Long clientId,
                              double accountBalance,
                              AccountStatus status
) {

    public ClientRespDto getClient() {
        if (Objects.isNull(this.clientId)) {
            return null;
        }
        return ClientRespDto.fromId(this.clientId);
    }
}
