package com.optimize.elykia.core.service.user;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserManagementTest {

    @Mock private UserService userService;

    @Test
    void getPromoters_delegatesUsingOnlyPromoterProfile() {
        // Given
        UserManagement management = new UserManagement(userService);
        List<User> promoters = List.of(new User(), new User());
        when(userService.getByUserProfil(UserProfilConstant.PROMOTER)).thenReturn(promoters);

        // When
        List<User> returned = management.getPromoters();

        // Then
        assertSame(promoters, returned);
        verify(userService).getByUserProfil(UserProfilConstant.PROMOTER);
    }
}
