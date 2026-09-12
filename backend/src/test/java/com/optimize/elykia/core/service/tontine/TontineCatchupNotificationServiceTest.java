package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.repository.TontineCatchupNotificationReadRepository;
import com.optimize.elykia.core.repository.TontineCatchupNotificationRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineCatchupNotificationServiceTest {

    @Mock
    private TontineCatchupNotificationRepository notificationRepository;
    @Mock
    private TontineCatchupNotificationReadRepository readRepository;

    @InjectMocks
    private TontineCatchupNotificationService service;

    @Test
    void unreadCount_rejectsCommercial() {
        User commercial = mock(User.class);
        when(commercial.getUsername()).thenReturn("COM003");
        when(commercial.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(commercial.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(commercial.is(UserProfilConstant.ADMIN)).thenReturn(false);

        assertThrows(CustomValidationException.class, () -> service.unreadCount(commercial));
        verifyNoInteractions(notificationRepository, readRepository);
    }

    @Test
    void listGrouped_rejectsCommercial() {
        User commercial = mock(User.class);
        when(commercial.getUsername()).thenReturn("COM003");
        when(commercial.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(commercial.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(commercial.is(UserProfilConstant.ADMIN)).thenReturn(false);

        assertThrows(CustomValidationException.class, () -> service.listGrouped(commercial));
        verifyNoInteractions(notificationRepository, readRepository);
    }
}
