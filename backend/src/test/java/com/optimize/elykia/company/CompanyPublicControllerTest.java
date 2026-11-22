package com.optimize.elykia.company;

import com.optimize.elykia.company.application.CompanyProfileService;
import com.optimize.elykia.company.domain.CompanyLogoAsset;
import com.optimize.elykia.company.domain.CompanyProfile;
import com.optimize.elykia.company.web.CompanyPublicController;
import com.optimize.elykia.company.web.dto.CompanyProfileDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompanyPublicControllerTest {

    @Mock
    private CompanyProfileService service;

    private CompanyPublicController controller;

    @BeforeEach
    void setUp() {
        controller = new CompanyPublicController(service);
    }

    @Test
    void getBrandingReturns200WithEtagAnd304OnMatchingIfNoneMatch() {
        CompanyProfile entity = CompanyProfile.createDefault();
        entity.setThemeVersion(4L);
        CompanyProfileDto dto = CompanyProfileDto.fromEntity(entity);
        when(service.getCurrentProfile()).thenReturn(dto);

        ResponseEntity<CompanyProfileDto> fresh = controller.getBranding(null);
        assertEquals(HttpStatus.OK, fresh.getStatusCode());
        assertEquals("\"company-v4\"", fresh.getHeaders().getETag());
        assertNotNull(fresh.getHeaders().getCacheControl());
        assertTrue(fresh.getHeaders().getCacheControl().contains("no-cache"));
        assertEquals(dto, fresh.getBody());

        ResponseEntity<CompanyProfileDto> notModified = controller.getBranding("\"company-v4\"");
        assertEquals(HttpStatus.NOT_MODIFIED, notModified.getStatusCode());
        assertNull(notModified.getBody());

        ResponseEntity<CompanyProfileDto> weakNotModified = controller.getBranding("W/\"company-v4\"");
        assertEquals(HttpStatus.NOT_MODIFIED, weakNotModified.getStatusCode());
    }

    @Test
    void getLogoReturns404WhenAbsentAndImmutableResponseWithCspForSvg() {
        when(service.getCurrentLogo()).thenReturn(Optional.empty());
        assertEquals(HttpStatus.NOT_FOUND, controller.getLogo(null).getStatusCode());

        byte[] svgBytes = "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".getBytes(StandardCharsets.UTF_8);
        CompanyLogoAsset asset = new CompanyLogoAsset(svgBytes, "image/svg+xml", "logo.svg", 9L);
        when(service.getCurrentLogo()).thenReturn(Optional.of(asset));

        ResponseEntity<byte[]> response = controller.getLogo(null);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("\"company-logo-v9\"", response.getHeaders().getETag());
        assertNotNull(response.getHeaders().getCacheControl());
        assertTrue(response.getHeaders().getCacheControl().contains("immutable"));
        assertEquals("nosniff", response.getHeaders().getFirst("X-Content-Type-Options"));
        assertNotNull(response.getHeaders().getFirst("Content-Security-Policy"));

        ResponseEntity<byte[]> notModified = controller.getLogo("\"company-logo-v9\"");
        assertEquals(HttpStatus.NOT_MODIFIED, notModified.getStatusCode());
    }
}
