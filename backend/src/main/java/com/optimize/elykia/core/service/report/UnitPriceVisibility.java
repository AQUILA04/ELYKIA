package com.optimize.elykia.core.service.report;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.shared.security.UserProfilConstant;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;

/**
 * Le paramètre {@code RESTRICT_UNIT_PRICE_VISIBILITY} à {@code true} réserve le prix unitaire
 * au gestionnaire et aux profils admin. À {@code false}, l'affichage actuel est conservé.
 * <p>
 * Une vente comptant ({@link OperationType#CASH}) suit son propre paramètre,
 * {@code RESTRICT_CASH_SALE_UNIT_PRICE_VISIBILITY}, avec la même règle de profil. Les commandes et
 * livraisons tontine, ainsi que les demandes de sortie et retours de stock tontine, suivent ce même
 * paramètre (appeler {@code apply(context, OperationType.CASH)}).
 * L'espace client suit {@code RESTRICT_CUSTOMER_SPACE_UNIT_PRICE_VISIBILITY}, lu côté client.
 */
@Service
@RequiredArgsConstructor
public class UnitPriceVisibility {

    public static final String PARAMETER_KEY = "RESTRICT_UNIT_PRICE_VISIBILITY";
    public static final String CASH_SALE_PARAMETER_KEY = "RESTRICT_CASH_SALE_UNIT_PRICE_VISIBILITY";
    public static final String CUSTOMER_SPACE_PARAMETER_KEY = "RESTRICT_CUSTOMER_SPACE_UNIT_PRICE_VISIBILITY";
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
        apply(context, null);
    }

    /** Applique la règle du type de vente : CASH suit son paramètre, les autres le paramètre général. */
    public static void apply(Context context, OperationType saleType) {
        if (context == null) {
            return;
        }
        boolean show = instance == null || instance.showUnitPrice(saleType);
        context.setVariable(CONTEXT_VARIABLE, show);
    }

    public boolean showUnitPrice() {
        return showUnitPrice(null);
    }

    public boolean showUnitPrice(OperationType saleType) {
        if (!parameterService.isEnabled(parameterKeyFor(saleType))) {
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

    static String parameterKeyFor(OperationType saleType) {
        return saleType == OperationType.CASH ? CASH_SALE_PARAMETER_KEY : PARAMETER_KEY;
    }
}
