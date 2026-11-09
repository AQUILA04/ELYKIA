package com.optimize.elykia.core.service.report;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.context.Context;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UnitPriceVisibilityTest {

    @Mock
    private ParameterService parameterService;
    @Mock
    private UserService userService;
    @Mock
    private User user;

    @AfterEach
    void resetStaticHook() {
        UnitPriceVisibility.resetForTests();
    }

    @Test
    void showsPricesWhenParameterIsDisabled() {
        when(parameterService.isEnabled(UnitPriceVisibility.PARAMETER_KEY)).thenReturn(false);
        UnitPriceVisibility visibility = new UnitPriceVisibility(parameterService, userService);

        assertTrue(visibility.showUnitPrice());
        verify(userService, never()).getCurrentUser();
    }

    @Test
    void hidesPricesWhenRestrictedAndProfileIsNotPrivileged() {
        when(parameterService.isEnabled(UnitPriceVisibility.PARAMETER_KEY)).thenReturn(true);
        when(userService.getCurrentUser()).thenReturn(user);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.SU)).thenReturn(false);
        UnitPriceVisibility visibility = new UnitPriceVisibility(parameterService, userService);
        visibility.register();

        Context context = new Context();
        UnitPriceVisibility.apply(context);

        assertEquals(Boolean.FALSE, context.getVariable(UnitPriceVisibility.CONTEXT_VARIABLE));
    }

    @Test
    void keepsPricesForGestionnaireWhenRestricted() {
        when(parameterService.isEnabled(UnitPriceVisibility.PARAMETER_KEY)).thenReturn(true);
        when(userService.getCurrentUser()).thenReturn(user);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(true);
        UnitPriceVisibility visibility = new UnitPriceVisibility(parameterService, userService);

        assertTrue(visibility.showUnitPrice());
    }

    @Test
    void applyShowsPricesWhenSpringBeanIsAbsent() {
        Context context = new Context();
        UnitPriceVisibility.apply(context);
        assertEquals(Boolean.TRUE, context.getVariable(UnitPriceVisibility.CONTEXT_VARIABLE));
    }
}
