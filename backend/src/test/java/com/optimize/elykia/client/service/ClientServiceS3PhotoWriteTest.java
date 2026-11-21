package com.optimize.elykia.client.service;

import com.optimize.elykia.client.config.ClientAutoInitProperties;
import com.optimize.elykia.client.config.ClientProperties;
import com.optimize.elykia.client.dto.ClientPhotoCheckDto;
import com.optimize.elykia.client.dto.PhotoUploadResultDto;
import com.optimize.elykia.client.dto.UpdatePhotoDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.entity.PhotoStore;
import com.optimize.elykia.client.enumeration.PhotoType;
import com.optimize.elykia.client.mapper.ClientMapper;
import com.optimize.elykia.client.outbox.PhotoOutboxService;
import com.optimize.elykia.client.repository.BusinessCreditAuthorizationEventRepository;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.repository.PhotoStoreRepository;
import com.optimize.elykia.client.storage.ImageProcessingService;
import com.optimize.elykia.client.storage.MinioStorageService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientServiceS3PhotoWriteTest {

    private static final Long CLIENT_ID = 99L;

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
    @Mock private Query advisoryLockQuery;

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
        ReflectionTestUtils.setField(clientService, "s3PhotoMigrationEnabled", true);
        ReflectionTestUtils.setField(clientService, "entityManager", entityManager);
    }

    @Test
    void persistNewClient_whenS3Enabled_uploadsToMinioAndSkipsPhotoStore() {
        Client incoming = new Client();
        incoming.setPhone("90000000");
        incoming.setProfilPhoto(new byte[] {1, 2, 3});
        incoming.setIDDoc(new byte[] {4, 5, 6});

        when(entityManager.createNativeQuery(anyString())).thenReturn(advisoryLockQuery);
        when(advisoryLockQuery.setParameter(anyInt(), any())).thenReturn(advisoryLockQuery);
        when(advisoryLockQuery.getSingleResult()).thenReturn(1L);
        when(clientRepository.saveAndFlush(any(Client.class))).thenAnswer(inv -> {
            Client c = inv.getArgument(0);
            if (c.getId() == null) {
                c.setId(CLIENT_ID);
            }
            return c;
        });
        Client stored = clientWithId(CLIENT_ID);
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(stored));
        when(minioStorageService.isAvailable()).thenReturn(true);
        when(imageProcessingService.generateThumbnail(any(), anyInt(), anyInt())).thenReturn(new byte[] {9});
        when(minioStorageService.uploadPhoto(anyString(), any(), anyString()))
                .thenAnswer(inv -> "https://s3.example/" + inv.getArgument(0));

        ReflectionTestUtils.invokeMethod(clientService, "persistNewClient", incoming);

        verify(photoStoreRepository, never()).saveProfilAndCard(any(), any());
        verify(minioStorageService).uploadPhoto(eq("clients/99/profil/original.jpg"), any(), eq("image/jpeg"));
        verify(minioStorageService).uploadPhoto(eq("clients/99/card/original.jpg"), any(), eq("image/jpeg"));
    }

    @Test
    void uploadClientPhotos_whenMinioUp_persistsUrlsAndSkipsOutboxAndPhotoStore() {
        byte[] profil = new byte[] {1, 2, 3};
        byte[] card = new byte[] {4, 5, 6};
        byte[] thumb = new byte[] {9};

        Client client = clientWithId(CLIENT_ID);
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(minioStorageService.isAvailable()).thenReturn(true);
        when(imageProcessingService.generateThumbnail(any(), anyInt(), anyInt())).thenReturn(thumb);
        when(minioStorageService.uploadPhoto(anyString(), any(), anyString()))
                .thenAnswer(inv -> "https://s3.example/" + inv.getArgument(0));
        when(clientRepository.saveAndFlush(any(Client.class))).thenAnswer(inv -> inv.getArgument(0));

        PhotoUploadResultDto result = clientService.uploadClientPhotos(CLIENT_ID, profil, card);

        assertEquals("https://s3.example/clients/99/profil/original.jpg", result.profilPhotoUrl());
        assertEquals("https://s3.example/clients/99/card/original.jpg", result.cardPhotoUrl());
        assertEquals("https://s3.example/clients/99/profil/thumb.jpg", result.profilPhotoThumbUrl());
        assertEquals("https://s3.example/clients/99/card/thumb.jpg", result.cardPhotoThumbUrl());
        verifyNoInteractions(photoOutboxService);
        verify(photoStoreRepository, never()).saveProfilAndCard(any(), any());
        verify(photoStoreRepository, never()).updateProfil(anyLong(), any());
        verify(photoStoreRepository, never()).updateCard(anyLong(), any());
    }

    @Test
    void uploadClientPhotos_whenMinioDown_savesFallbackAndLeavesUrlsNull() {
        byte[] profil = new byte[] {1, 2, 3};
        Client client = clientWithId(CLIENT_ID);
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(minioStorageService.isAvailable()).thenReturn(false);

        PhotoUploadResultDto result = clientService.uploadClientPhotos(CLIENT_ID, profil, null);

        assertEquals(null, result.profilPhotoUrl());
        verify(photoOutboxService).saveFallback(CLIENT_ID, PhotoType.PROFIL, profil);
        verify(minioStorageService, never()).uploadPhoto(anyString(), any(), anyString());
    }

    @Test
    void updateClientPhoto_whenS3Enabled_usesMinioNotPhotoStore() {
        Client client = clientWithId(CLIENT_ID);
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(minioStorageService.isAvailable()).thenReturn(true);
        when(imageProcessingService.generateThumbnail(any(), anyInt(), anyInt())).thenReturn(new byte[] {1});
        when(minioStorageService.uploadPhoto(anyString(), any(), anyString()))
                .thenReturn("https://s3.example/photo.jpg");
        when(clientRepository.saveAndFlush(any(Client.class))).thenAnswer(inv -> inv.getArgument(0));

        String photoB64 = longJpegDataUrl();
        clientService.updateClientPhoto(new UpdatePhotoDto(CLIENT_ID, photoB64, null, null, null));

        verify(minioStorageService).uploadPhoto(eq("clients/99/profil/original.jpg"), any(), eq("image/jpeg"));
        verify(photoStoreRepository, never()).updateProfil(anyLong(), any());
        verify(photoStoreRepository, never()).updateCard(anyLong(), any());
    }

    @Test
    void updateClientPhoto_whenS3Disabled_usesPhotoStore() {
        ReflectionTestUtils.setField(clientService, "s3PhotoMigrationEnabled", false);
        Client client = clientWithId(CLIENT_ID);
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        when(clientRepository.saveAndFlush(any(Client.class))).thenAnswer(inv -> inv.getArgument(0));

        String photoB64 = longJpegDataUrl();
        clientService.updateClientPhoto(new UpdatePhotoDto(CLIENT_ID, photoB64, null, null, null));

        ArgumentCaptor<byte[]> bytesCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(photoStoreRepository).updateProfil(eq(CLIENT_ID), bytesCaptor.capture());
        assertTrue(bytesCaptor.getValue().length > 0);
        verifyNoInteractions(minioStorageService);
        verifyNoInteractions(photoOutboxService);
    }

    @Test
    void checkMissingPhotos_treatsMinioUrlAsPresent() {
        Client client = clientWithId(CLIENT_ID);
        client.setProfilPhotoUrl("https://s3.example/clients/99/profil/original.jpg");
        client.setCardPhotoUrl("https://s3.example/clients/99/card/original.jpg");
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));

        List<ClientPhotoCheckDto> missing = clientService.checkMissingPhotos(List.of(CLIENT_ID));

        assertTrue(missing.isEmpty());
        verify(photoStoreRepository, never()).getClientProfil(anyLong());
        verify(photoStoreRepository, never()).getClientCard(anyLong());
    }

    @Test
    void checkMissingPhotos_fallsBackToPhotoStoreWhenNoUrl() {
        Client client = clientWithId(CLIENT_ID);
        when(clientRepository.findById(CLIENT_ID)).thenReturn(Optional.of(client));
        PhotoStore profil = PhotoStore.ofProfil(CLIENT_ID, new byte[600]);
        when(photoStoreRepository.getClientProfil(CLIENT_ID)).thenReturn(profil);
        when(photoStoreRepository.getClientCard(CLIENT_ID)).thenReturn(null);

        List<ClientPhotoCheckDto> missing = clientService.checkMissingPhotos(List.of(CLIENT_ID));

        assertEquals(1, missing.size());
        assertFalse(missing.get(0).missingProfil());
        assertTrue(missing.get(0).missingCard());
    }

    private static Client clientWithId(Long id) {
        Client client = new Client();
        client.setId(id);
        return client;
    }

    private static String longJpegDataUrl() {
        byte[] raw = new byte[800];
        for (int i = 0; i < raw.length; i++) {
            raw[i] = (byte) (i % 64);
        }
        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(raw);
    }
}
