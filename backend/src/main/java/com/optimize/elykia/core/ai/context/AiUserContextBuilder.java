package com.optimize.elykia.core.ai.context;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class AiUserContextBuilder {

    private final UserService userService;

    public AiUserContext build() {
        User user = userService.getCurrentUser();
        boolean collectorScoped = user.is(UserProfilConstant.PROMOTER);
        return AiUserContext.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .profil(collectorScoped ? UserProfilConstant.PROMOTER : "")
                .roles(Collections.emptySet())
                .today(LocalDate.now())
                .collectorScoped(collectorScoped)
                .build();
    }
}
