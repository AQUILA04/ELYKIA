package com.optimize.elykia.core.service.tontine;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.TontineDeliveryListDto;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineDeliveryWebServiceTest {

    private static final LocalDateTime DATE_FROM = LocalDateTime.of(2026, 8, 1, 0, 0);
    private static final LocalDateTime DATE_TO = LocalDateTime.of(2026, 8, 31, 23, 59);

    @Mock
    private TontineDeliveryRepository deliveryRepository;
    @Mock
    private UserService userService;
    @InjectMocks
    private TontineDeliveryWebService service;

    @Test
    void getDeliveriesForWeb_normalizesFiltersAndMapsDeliveryFields() {
        // Given
        User currentUser = user(false, null);
        TontineDelivery delivery = delivery();
        Pageable pageable = PageRequest.of(0, 20);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deliveryRepository.findWithFilters("collector.a", DATE_FROM, DATE_TO, "Marie", pageable))
                .thenReturn(new PageImpl<>(List.of(delivery), pageable, 1));

        // When
        Page<TontineDeliveryListDto> result = service.getDeliveriesForWeb(
                DATE_FROM, DATE_TO, "  collector.a  ", "  Marie  ", pageable);

        // Then
        assertEquals(1, result.getTotalElements());
        TontineDeliveryListDto dto = result.getContent().get(0);
        assertEquals(50L, dto.getId());
        assertEquals(30L, dto.getTontineMemberId());
        assertEquals(20L, dto.getClientId());
        assertEquals("Marie", dto.getClientFirstname());
        assertEquals("Client", dto.getClientLastname());
        assertEquals("690000000", dto.getClientPhone());
        assertEquals("LIV-2026-0001", dto.getReference());
        assertEquals(125_000.0, dto.getTotalAmount());
        assertEquals(25_000.0, dto.getRemainingBalance());
        assertEquals("collector.a", dto.getCommercialUsername());
        assertEquals(TontineMemberDeliveryStatus.VALIDATED, dto.getDeliveryStatus());
        assertEquals(0, dto.getItemCount());
        verify(deliveryRepository).findWithFilters("collector.a", DATE_FROM, DATE_TO, "Marie", pageable);
    }

    @Test
    void elasticsearch_enforcesCurrentPromoterFilterInsteadOfRequestedCommercial() {
        // Given
        User currentPromoter = user(true, "promoter.a");
        TontineDelivery delivery = delivery();
        Pageable pageable = PageRequest.of(0, 10);
        when(userService.getCurrentUser()).thenReturn(currentPromoter);
        when(deliveryRepository.elasticsearch("client", "promoter.a", DATE_FROM, DATE_TO, pageable))
                .thenReturn(new PageImpl<>(List.of(delivery), pageable, 1));

        // When
        Page<TontineDeliveryListDto> result = service.elasticsearch(
                " client ", DATE_FROM, DATE_TO, "other.collector", pageable);

        // Then
        assertEquals(1, result.getTotalElements());
        verify(deliveryRepository).elasticsearch("client", "promoter.a", DATE_FROM, DATE_TO, pageable);
    }

    private User user(boolean promoter, String username) {
        User user = org.mockito.Mockito.mock(User.class);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(promoter);
        if (promoter) {
            when(user.getUsername()).thenReturn(username);
        }
        return user;
    }

    private TontineDelivery delivery() {
        Client client = new Client();
        client.setId(20L);
        client.setFirstname("Marie");
        client.setLastname("Client");
        client.setPhone("690000000");
        TontineMember member = new TontineMember();
        member.setId(30L);
        member.setClient(client);
        member.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setId(50L);
        delivery.setTontineMember(member);
        delivery.setReference("LIV-2026-0001");
        delivery.setDeliveryDate(DATE_TO);
        delivery.setRequestDate(DATE_FROM);
        delivery.setTotalAmount(125_000.0);
        delivery.setRemainingBalance(25_000.0);
        delivery.setCommercialUsername("collector.a");
        return delivery;
    }
}
