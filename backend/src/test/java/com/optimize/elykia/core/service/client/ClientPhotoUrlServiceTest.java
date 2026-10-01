package com.optimize.elykia.core.service.client;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.PhotoObjectKeyBuilder;
import com.optimize.elykia.core.dto.client.ClientPhotoKind;
import com.optimize.elykia.core.dto.client.ClientPhotoSize;
import com.optimize.elykia.core.dto.client.ClientPhotoUrlDto;
import com.optimize.elykia.core.dto.client.ClientPhotoUrlRequest;
import com.optimize.elykia.core.util.UserProfilConstant;
import io.minio.MinioClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.LongStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientPhotoUrlServiceTest {

    @Mock private ClientRepository clientRepository;
    @Mock private UserService userService;
    @Mock private MinioProperties minioProperties;
    @Mock private MinioClient signingClient;
    @Mock private User currentUser;

    private ClientPhotoUrlService service;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(minioProperties.getBucket()).thenReturn("elykia-clients");
        service = new ClientPhotoUrlService(
                clientRepository, userService, minioProperties, 60, signingClient);
    }

    @Test
    void resolveUrls_returnsThumbWhenPresent() throws Exception {
        Client client = client(10L, "COM1", null);
        client.setProfilPhotoThumbUrl("https://s3.example/elykia-clients/clients/10/profil/thumb.jpg");
        client.setProfilPhotoUrl("https://s3.example/elykia-clients/clients/10/profil/original.jpg");
        stubStaffUser();
        when(clientRepository.findAllByIds(List.of(10L))).thenReturn(List.of(client));
        when(signingClient.getPresignedObjectUrl(any())).thenReturn("https://s3.example/signed-thumb");

        List<ClientPhotoUrlDto> result = service.resolveUrls(request(List.of(10L), ClientPhotoKind.PROFIL, ClientPhotoSize.THUMB));

        assertEquals(1, result.size());
        assertEquals(10L, result.get(0).getClientId());
        assertEquals("https://s3.example/signed-thumb", result.get(0).getUrl());
        assertFalse(result.get(0).isLegacy());
        verify(signingClient).getPresignedObjectUrl(any());
        assertTrue(service.cacheView().containsKey(PhotoObjectKeyBuilder.profilThumb(10L)));
    }

    @Test
    void resolveUrls_fallsBackToOriginalWhenThumbMissing() throws Exception {
        Client client = client(11L, "COM1", null);
        client.setProfilPhotoUrl("https://s3.example/elykia-clients/clients/11/profil/original.jpg");
        stubStaffUser();
        when(clientRepository.findAllByIds(List.of(11L))).thenReturn(List.of(client));
        when(signingClient.getPresignedObjectUrl(any())).thenReturn("https://s3.example/signed-original");

        List<ClientPhotoUrlDto> result = service.resolveUrls(request(List.of(11L), ClientPhotoKind.PROFIL, ClientPhotoSize.THUMB));

        assertEquals(1, result.size());
        assertEquals("https://s3.example/signed-original", result.get(0).getUrl());
        assertTrue(service.cacheView().containsKey(PhotoObjectKeyBuilder.profilOriginal(11L)));
    }

    @Test
    void resolveUrls_marksLegacyWhenNoMinioUrls() {
        Client client = client(12L, "COM1", null);
        stubStaffUser();
        when(clientRepository.findAllByIds(List.of(12L))).thenReturn(List.of(client));

        List<ClientPhotoUrlDto> result = service.resolveUrls(request(List.of(12L), ClientPhotoKind.PROFIL, ClientPhotoSize.THUMB));

        assertEquals(1, result.size());
        assertTrue(result.get(0).isLegacy());
        assertNull(result.get(0).getUrl());
    }

    @Test
    void resolveUrls_filtersPortfolioForPromoter() throws Exception {
        Client owned = client(1L, "COM_A", null);
        owned.setProfilPhotoThumbUrl("https://s3.example/t1");
        Client other = client(2L, "COM_B", null);
        other.setProfilPhotoThumbUrl("https://s3.example/t2");
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(currentUser.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(currentUser.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(currentUser.getUsername()).thenReturn("COM_A");
        when(clientRepository.findAllByIds(List.of(1L, 2L))).thenReturn(List.of(owned, other));
        when(signingClient.getPresignedObjectUrl(any())).thenReturn("https://s3.example/signed");

        List<ClientPhotoUrlDto> result = service.resolveUrls(request(List.of(1L, 2L), ClientPhotoKind.PROFIL, ClientPhotoSize.THUMB));

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).getClientId());
    }

    @Test
    void resolveUrls_rejectsBatchAboveLimit() {
        List<Long> ids = LongStream.rangeClosed(1, ClientPhotoUrlService.MAX_BATCH_SIZE + 1)
                .boxed()
                .toList();
        ClientPhotoUrlRequest req = request(ids, ClientPhotoKind.PROFIL, ClientPhotoSize.THUMB);

        assertThrows(CustomValidationException.class, () -> service.resolveUrls(req));
    }

    @Test
    void resolveUrls_reusesCachedUrl() throws Exception {
        Client client = client(20L, "COM1", null);
        client.setProfilPhotoThumbUrl("https://s3.example/t");
        stubStaffUser();
        when(clientRepository.findAllByIds(List.of(20L))).thenReturn(List.of(client));
        when(signingClient.getPresignedObjectUrl(any())).thenReturn("https://s3.example/cached");

        service.resolveUrls(request(List.of(20L), ClientPhotoKind.PROFIL, ClientPhotoSize.THUMB));
        service.resolveUrls(request(List.of(20L), ClientPhotoKind.PROFIL, ClientPhotoSize.THUMB));

        verify(signingClient, times(1)).getPresignedObjectUrl(any());
    }

    @Test
    void resolveUrls_includesTontineCollectorInPortfolio() throws Exception {
        Client client = client(3L, "OTHER", "COM_T");
        client.setCardPhotoThumbUrl("https://s3.example/card");
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        when(currentUser.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(currentUser.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(currentUser.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(currentUser.getUsername()).thenReturn("COM_T");
        when(clientRepository.findAllByIds(List.of(3L))).thenReturn(List.of(client));
        when(signingClient.getPresignedObjectUrl(any())).thenReturn("https://s3.example/card-signed");

        List<ClientPhotoUrlDto> result = service.resolveUrls(request(List.of(3L), ClientPhotoKind.CARD, ClientPhotoSize.THUMB));

        assertEquals(1, result.size());
        assertEquals(3L, result.get(0).getClientId());
        assertTrue(service.cacheView().containsKey(PhotoObjectKeyBuilder.cardThumb(3L)));
    }

    private void stubStaffUser() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        // isPromoterOnly short-circuits when not PROMOTER; other is() calls unused
    }

    private static Client client(Long id, String collector, String tontineCollector) {
        Client c = new Client();
        c.setId(id);
        c.setCollector(collector);
        c.setTontineCollector(tontineCollector);
        return c;
    }

    private static ClientPhotoUrlRequest request(List<Long> ids, ClientPhotoKind kind, ClientPhotoSize size) {
        ClientPhotoUrlRequest req = new ClientPhotoUrlRequest();
        req.setClientIds(new ArrayList<>(ids));
        req.setKind(kind);
        req.setSize(size);
        return req;
    }
}
