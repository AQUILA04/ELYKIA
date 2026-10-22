package com.optimize.elykia.core.dto.carnet;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CarnetEcartKeysRequest {
    private List<String> keys;
    private String note;
}
