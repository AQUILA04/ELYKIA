package com.optimize.elykia.core.dto.client;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ClientPhotoUrlRequest {

    @NotEmpty
    private List<Long> clientIds;

    @NotNull
    private ClientPhotoKind kind = ClientPhotoKind.PROFIL;

    @NotNull
    private ClientPhotoSize size = ClientPhotoSize.THUMB;
}
