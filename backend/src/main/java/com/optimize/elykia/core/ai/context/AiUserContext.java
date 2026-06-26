package com.optimize.elykia.core.ai.context;

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
