package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.TontineArticleReservationDto;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TontineStockReservationServiceTest {

    @Mock
    private TontineDeliveryRepository deliveryRepository;
    @Mock
    private UserService userService;

    @InjectMocks
    private TontineStockReservationService service;

    @Test
    void returnsTheQuantitiesOfOrdersNotYetDelivered() {
        givenUser(false, "gest");
        when(deliveryRepository.reservedQuantitiesByArticle(eq("COM005"), anyCollection())).thenReturn(List.of(
                new Object[]{11L, 4L, 2L},
                new Object[]{12, null, 1L},
                new Object[]{null, 3L, 1L}));

        List<TontineArticleReservationDto> result = service.reservationsFor(" COM005 ");

        assertEquals(List.of(new TontineArticleReservationDto(11L, 4L, 2L), new TontineArticleReservationDto(12L, 0L, 1L)), result);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<TontineMemberDeliveryStatus>> statuses = ArgumentCaptor.forClass(Collection.class);
        verify(deliveryRepository).reservedQuantitiesByArticle(eq("COM005"), statuses.capture());
        assertTrue(statuses.getValue().containsAll(List.of(TontineMemberDeliveryStatus.PENDING, TontineMemberDeliveryStatus.VALIDATED)));
        assertFalse(statuses.getValue().contains(TontineMemberDeliveryStatus.DELIVERED));
    }

    @Test
    void aCommercialOnlyReadsHisOwnReservations() {
        givenUser(true, "COM005");
        when(deliveryRepository.reservedQuantitiesByArticle(eq("COM005"), anyCollection())).thenReturn(List.of());

        service.reservationsFor("COM001");

        verify(deliveryRepository).reservedQuantitiesByArticle(eq("COM005"), anyCollection());
    }

    @Test
    void aManagerMustChooseTheCommercial() {
        givenUser(false, "gest");

        assertThrows(CustomValidationException.class, () -> service.reservationsFor(" "));
        verifyNoInteractions(deliveryRepository);
    }

    private void givenUser(boolean commercial, String username) {
        User user = mock(User.class);
        lenient().when(user.is(UserProfilConstant.PROMOTER)).thenReturn(commercial);
        lenient().when(user.getUsername()).thenReturn(username);
        when(userService.getCurrentUser()).thenReturn(user);
    }
}
