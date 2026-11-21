package com.optimize.elykia.client.service;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.config.ClientAutoInitProperties;
import com.optimize.elykia.client.config.ClientProperties;
import com.optimize.elykia.client.dto.ClientRespDto;
import com.optimize.elykia.client.enumeration.ClientRegistrationSource;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.mapper.ClientMapper;
import com.optimize.elykia.client.outbox.PhotoOutboxService;
import com.optimize.elykia.client.repository.BusinessCreditAuthorizationEventRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.repository.PhotoStoreRepository;
import com.optimize.elykia.client.storage.ImageProcessingService;
import com.optimize.elykia.client.storage.MinioStorageService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientServiceActiveOnlyFilterTest {

    @Mock private ClientRepository clientRepository;
    @Mock private ClientMapper clientMapper;
    @Mock private ClientProperties clientProperties;
    @Mock private ClientAutoInitProperties clientAutoInitProperties;
    @Mock private AccountService accountService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private PhotoStoreRepository photoStoreRepository;
    @Mock private BusinessCreditAuthorizationEventRepository businessCreditAuthorizationEventRepository;
    @Mock private MinioStorageService minioStorageService;
    @Mock private ImageProcessingService imageProcessingService;
    @Mock private PhotoOutboxService photoOutboxService;
    @Mock private EntityManager entityManager;

    private ClientService clientService;

    @BeforeEach
    void setUp() {
        clientService = new ClientService(
                clientRepository,
                clientMapper,
                clientProperties,
                clientAutoInitProperties,
                accountService,
                eventPublisher,
                photoStoreRepository,
                businessCreditAuthorizationEventRepository,
                minioStorageService,
                imageProcessingService,
                photoOutboxService);
        ReflectionTestUtils.setField(clientService, "entityManager", entityManager);
    }

    @Test
    void getAll_passesActiveOnlyToRepository() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<ClientRespDto> empty = new PageImpl<>(List.of());
        when(clientRepository.findClientsDto(
                isNull(), isNull(), isNull(), isNull(), isNull(), eq(true), eq(pageable)))
                .thenReturn(empty);

        clientService.getAll(null, null, null, null, null, true, pageable);

        verify(clientRepository).findClientsDto(
                isNull(), isNull(), isNull(), isNull(), isNull(), eq(true), eq(pageable));
    }

    @Test
    void getAllClientByCollector_passesActiveOnlyToRepository() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<ClientRespDto> empty = new PageImpl<>(List.of());
        when(clientRepository.findByCollectorAndClientTypeAndState(
                eq("COM001"), eq(ClientType.CLIENT), eq(State.ENABLED), eq(true), eq(pageable)))
                .thenReturn(empty);

        clientService.getAllClientByCollector("COM001", true, pageable);

        verify(clientRepository).findByCollectorAndClientTypeAndState(
                eq("COM001"), eq(ClientType.CLIENT), eq(State.ENABLED), eq(true), eq(pageable));
    }

    @Test
    void elasticsearch_passesActiveOnlyToRepository() {
        Pageable pageable = PageRequest.of(0, 20);
        when(clientRepository.elasticsearch(
                eq("dupont"), eq("COM001"), eq(false), isNull(),
                isNull(), eq(true), eq(pageable)))
                .thenReturn(Page.empty());

        clientService.elasticsearch("dupont", "COM001", false, null,
                (ClientRegistrationSource) null, true, pageable);

        verify(clientRepository).elasticsearch(
                eq("dupont"), eq("COM001"), eq(false), isNull(),
                isNull(), eq(true), eq(pageable));
    }
}
