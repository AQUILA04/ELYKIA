package com.optimize.elykia.core.service.customer;

import com.optimize.elykia.core.dto.customer.CustomerActivityLogSearchCriteria;
import com.optimize.elykia.core.entity.customer.CustomerActivityLog;
import com.optimize.elykia.core.repository.customer.CustomerActivityLogRepository;
import com.optimize.common.securities.security.jwt.JwtUtils;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerActivityLogSearchTest {

    @Mock private CustomerActivityLogRepository repository;
    @Mock private JwtUtils jwtUtils;
    @Mock private CustomerContextService contextService;
    @Mock private EntityManager entityManager;

    @InjectMocks
    private CustomerActivityLogService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "retentionDays", 180);
    }

    @Test
    void searchUsesSpecificationAndMapsDto() {
        CustomerActivityLog entity = new CustomerActivityLog();
        entity.setId(1L);
        entity.setEventId(UUID.randomUUID());
        entity.setOccurredAt(Instant.parse("2026-09-29T10:00:00Z"));
        entity.setReceivedAt(Instant.parse("2026-09-29T10:00:01Z"));
        entity.setSource("CLIENT_APP");
        entity.setCategory("ERROR");
        entity.setEventType("HTTP_ERROR");
        entity.setPhone("90123456");

        when(repository.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        var page = service.search(
                CustomerActivityLogSearchCriteria.builder()
                        .category("ERROR")
                        .phone("90 12 34 56")
                        .build(),
                PageRequest.of(0, 50));

        assertEquals(1, page.getTotalElements());
        assertEquals("HTTP_ERROR", page.getContent().get(0).getEventType());
        assertEquals("90123456", page.getContent().get(0).getPhone());

        ArgumentCaptor<Specification<CustomerActivityLog>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        verify(repository).findAll(specCaptor.capture(), any(PageRequest.class));
    }

    @Test
    void sessionTimelineReturnsOrderedDtos() {
        CustomerActivityLog entity = new CustomerActivityLog();
        entity.setId(2L);
        entity.setEventId(UUID.randomUUID());
        entity.setOccurredAt(Instant.parse("2026-09-29T09:00:00Z"));
        entity.setReceivedAt(Instant.parse("2026-09-29T09:00:01Z"));
        entity.setSessionId("sess-1");
        entity.setEventType("LOGIN_SUCCESS");
        entity.setCategory("AUTH");
        entity.setSource("SERVER");

        when(repository.findSessionTimeline(eq("sess-1"), any(), any(), any()))
                .thenReturn(List.of(entity));

        var timeline = service.sessionTimeline("sess-1", null, null, 500);
        assertEquals(1, timeline.size());
        assertEquals("LOGIN_SUCCESS", timeline.get(0).getEventType());
        assertEquals("sess-1", timeline.get(0).getSessionId());
    }
}
