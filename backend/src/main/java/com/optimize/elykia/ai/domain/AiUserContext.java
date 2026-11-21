package com.optimize.elykia.ai.domain;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.Set;

@Getter
@Builder
public class AiUserContext {
    private Long userId;
    private String username;
    private String profil;
    private Set<String> roles;
    private LocalDate today;
    private boolean collectorScoped;
}
