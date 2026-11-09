package com.optimize.elykia.core.service.report;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.util.UserProfilConstant;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;

/**
 * Le paramètre {@code RESTRICT_UNIT_PRICE_VISIBILITY} à {@code true} réserve le prix unitaire
 * au gestionnaire et aux profils admin. À {@code false}, l'affichage actuel est conservé.
 */
@Service
@RequiredArgsConstructor
public class UnitPriceVisibility {

    public static final String PARAMETER_KEY = "RESTRICT_UNIT_PRICE_VISIBILITY";
    public static final String CONTEXT_VARIABLE = "showUnitPrice";

    private static UnitPriceVisibility instance;

    private final ParameterService parameterService;
    private final UserService userService;

    @PostConstruct
    void register() {
        instance = this;
    }

    static void resetForTests() {
        instance = null;
    }

    public static void apply(Context context) {
        if (context == null) {
            return;
        }
        boolean show = instance == null || instance.showUnitPrice();
        context.setVariable(CONTEXT_VARIABLE, show);
    }

    public boolean showUnitPrice() {
        if (!parameterService.isEnabled(PARAMETER_KEY)) {
            return true;
        }
        User user = userService.getCurrentUser();
        if (user == null) {
            return false;
        }
        return user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.SU);
    }
}
