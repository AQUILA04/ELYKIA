package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogBatchRequest;
import com.optimize.elykia.core.dto.customer.CustomerActivityLogEventDto;
import com.optimize.elykia.core.entity.customer.CustomerActivityLog;
import com.optimize.elykia.core.repository.customer.CustomerActivityLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerActivityLogServiceTest {

    @Mock private CustomerActivityLogRepository repository;
    @Mock private JwtUtils jwtUtils;
    @Mock private CustomerContextService contextService;

    @InjectMocks
    private CustomerActivityLogService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "retentionDays", 180);
    }

    @Test
    void rejectsBatchOver50() {
        CustomerActivityLogBatchRequest request = new CustomerActivityLogBatchRequest();
        request.setEvents(IntStream.range(0, 51).mapToObj(i -> event(UUID.randomUUID(), "1")).toList());
        assertThrows(CustomValidationException.class, () -> service.ingestClientBatch(request, null));
    }

    @Test
    void ignoresClientIdFromPayloadWithoutValidBearer() {
        when(repository.findExistingEventIds(anyCollection())).thenReturn(Set.of());
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerActivityLogBatchRequest request = new CustomerActivityLogBatchRequest();
        request.setEvents(List.of(event(UUID.randomUUID(), "999")));

        int accepted = service.ingestClientBatch(request, null);
        assertEquals(1, accepted);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<CustomerActivityLog>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        assertNull(captor.getValue().get(0).getClientId());
    }

    @Test
    void usesClientIdFromValidBearerAndDeduplicates() {
        UUID existing = UUID.randomUUID();
        UUID fresh = UUID.randomUUID();
        when(jwtUtils.validateJwtToken("tok")).thenReturn(true);
        when(jwtUtils.getUserNameFromJwtToken("tok")).thenReturn("90123456");
        when(contextService.findClientIdOptional("90123456")).thenReturn(Optional.of(42L));
        when(repository.findExistingEventIds(anyCollection())).thenReturn(Set.of(existing));
        when(repository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerActivityLogBatchRequest request = new CustomerActivityLogBatchRequest();
        request.setEvents(List.of(event(existing, "1"), event(fresh, "1")));

        int accepted = service.ingestClientBatch(request, "Bearer tok");
        assertEquals(1, accepted);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<CustomerActivityLog>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        assertEquals(42L, captor.getValue().get(0).getClientId());
        assertEquals(fresh, captor.getValue().get(0).getEventId());
    }

    @Test
    void recordServerEventPersistsAuthFailure() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.recordServerEvent("AUTH", "LOGIN_FAILED", "90123456", null, "bad pin", null);
        verify(repository).save(any(CustomerActivityLog.class));
    }

    private static CustomerActivityLogEventDto event(UUID id, String clientId) {
        CustomerActivityLogEventDto dto = new CustomerActivityLogEventDto();
        dto.setEventId(id);
        dto.setOccurredAt(Instant.now().toString());
        dto.setCategory("AUTH");
        dto.setEventType("PHONE_SUBMITTED");
        dto.setClientId(clientId);
        dto.setPhone("90123456");
        dto.setDeviceId("dev");
        dto.setSessionId("sess");
        dto.setPlatform("web");
        dto.setAppVersion("0.8.0");
        return dto;
    }
}
