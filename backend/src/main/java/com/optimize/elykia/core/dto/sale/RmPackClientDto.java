package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RmPackClientDto {
    private Long id;
    private String firstname;
    private String lastname;
    private String fullName;
    private String phone;
    private String quarter;
    private String collector;
    private Double latitude;
    private Double longitude;
    private String mll;
}
