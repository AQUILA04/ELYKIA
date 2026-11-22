package com.optimize.elykia.company;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.company.application.CompanyProfileService;
import com.optimize.elykia.company.domain.CompanyLogoAsset;
import com.optimize.elykia.company.domain.CompanyProfile;
import com.optimize.elykia.company.infrastructure.persistence.CompanyProfileRepository;
import com.optimize.elykia.company.web.dto.CompanyProfileDto;
import com.optimize.elykia.company.web.dto.CompanyProfileUpdateDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompanyProfileServiceTest {

    private static final byte[] VALID_PNG = new byte[]{
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D
    };
    private static final byte[] VALID_JPEG = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10
    };
    private static final byte[] VALID_WEBP = new byte[]{
            'R', 'I', 'F', 'F', 0x24, 0x00, 0x00, 0x00, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '
    };

    @Mock
    private CompanyProfileRepository repository;

    private CompanyProfileService service;

    @BeforeEach
    void setUp() {
        service = new CompanyProfileService(repository);
    }

    @Test
    void getCurrentProfileReturnsDefaultWhenTableIsEmpty() {
        when(repository.findById(CompanyProfile.SINGLETON_ID)).thenReturn(Optional.empty());

        CompanyProfileDto dto = service.getCurrentProfile();

        assertEquals(CompanyProfile.DEFAULT_COMPANY_NAME, dto.companyName());
        assertEquals(CompanyProfile.DEFAULT_PRIMARY_COLOR, dto.primaryColor());
        assertFalse(dto.hasLogo());
        assertNull(dto.logoUrl());
        assertEquals(1L, dto.themeVersion());
    }

    @Test
    void updateProfileNormalizesColorsTrimsFieldsAndBumpsVersion() {
        CompanyProfile existing = CompanyProfile.createDefault();
        existing.setThemeVersion(3L);
        when(repository.findById(CompanyProfile.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(CompanyProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CompanyProfileUpdateDto payload = new CompanyProfileUpdateDto(
                "  ACME Distribution  ",
                "  ACME ",
                "  Proximité & Confiance ",
                "  Lomé, Togo ",
                "  +228 90 00 00 00 ",
                "  contact@acme.tg ",
                "   ",
                "  NIF-12345 ",
                "#1B4D3E",
                "#2E8B57",
                "#D97706",
                "#0F2922",
                "#F1F5F9",
                "#F8FAFC"
        );

        CompanyProfileDto updated = service.updateProfile(payload, "admin.user");

        assertEquals("ACME Distribution", updated.companyName());
        assertEquals("ACME", updated.shortName());
        assertEquals("Proximité & Confiance", updated.tagline());
        assertNull(updated.website());
        assertEquals("#1b4d3e", updated.primaryColor());
        assertEquals("#2e8b57", updated.secondaryColor());
        assertEquals("#d97706", updated.accentColor());
        assertEquals("#0f2922", updated.sidebarBgColor());
        assertEquals("#f1f5f9", updated.sidebarTextColor());
        assertEquals("#f8fafc", updated.backgroundColor());
        assertEquals(4L, updated.themeVersion());
        assertEquals("admin.user", updated.updatedBy());
    }

    @Test
    void uploadLogoAcceptsValidPngJpegWebpAndSafeSvg() {
        CompanyProfile existing = CompanyProfile.createDefault();
        when(repository.findById(CompanyProfile.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(CompanyProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile pngFile = new MockMultipartFile("file", "brand logo.png", "image/png", VALID_PNG);
        CompanyProfileDto afterPng = service.uploadLogo(pngFile, "admin");
        assertTrue(afterPng.hasLogo());
        assertEquals("brand_logo.png", afterPng.logoFilename());
        assertEquals("/api/public/company/logo?v=2", afterPng.logoUrl());
        assertEquals(2L, afterPng.themeVersion());

        Optional<CompanyLogoAsset> cachedLogo = service.getCurrentLogo();
        assertTrue(cachedLogo.isPresent());
        assertArrayEquals(VALID_PNG, cachedLogo.get().data());
        assertEquals("image/png", cachedLogo.get().contentType());

        MockMultipartFile jpgFile = new MockMultipartFile("file", "logo.jpg", "image/jpeg", VALID_JPEG);
        assertEquals(3L, service.uploadLogo(jpgFile, "admin").themeVersion());

        MockMultipartFile webpFile = new MockMultipartFile("file", "logo.webp", "image/webp", VALID_WEBP);
        assertEquals(4L, service.uploadLogo(webpFile, "admin").themeVersion());

        byte[] safeSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/></svg>"
                .getBytes(StandardCharsets.UTF_8);
        MockMultipartFile svgFile = new MockMultipartFile("file", "logo.svg", "image/svg+xml", safeSvg);
        assertEquals(5L, service.uploadLogo(svgFile, "admin").themeVersion());
    }

    @Test
    void uploadLogoRejectsInvalidOrMaliciousFiles() {
        MockMultipartFile empty = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);
        assertThrows(CustomValidationException.class, () -> service.uploadLogo(empty, "admin"));

        MockMultipartFile tooBig = new MockMultipartFile(
                "file", "huge.png", "image/png", new byte[(int) CompanyProfileService.MAX_LOGO_BYTES + 1]);
        assertThrows(CustomValidationException.class, () -> service.uploadLogo(tooBig, "admin"));

        MockMultipartFile wrongMime = new MockMultipartFile("file", "doc.pdf", "application/pdf", VALID_PNG);
        assertThrows(CustomValidationException.class, () -> service.uploadLogo(wrongMime, "admin"));

        MockMultipartFile forgedPng = new MockMultipartFile("file", "fake.png", "image/png", "not-a-png".getBytes(StandardCharsets.UTF_8));
        assertThrows(CustomValidationException.class, () -> service.uploadLogo(forgedPng, "admin"));

        byte[] xssSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"
                .getBytes(StandardCharsets.UTF_8);
        MockMultipartFile maliciousSvg = new MockMultipartFile("file", "xss.svg", "image/svg+xml", xssSvg);
        assertThrows(CustomValidationException.class, () -> service.uploadLogo(maliciousSvg, "admin"));

        byte[] eventSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\"></svg>"
                .getBytes(StandardCharsets.UTF_8);
        MockMultipartFile eventHandlerSvg = new MockMultipartFile("file", "evt.svg", "image/svg+xml", eventSvg);
        assertThrows(CustomValidationException.class, () -> service.uploadLogo(eventHandlerSvg, "admin"));
    }

    @Test
    void deleteLogoAndResetThemePreserveOtherDataAndBumpVersion() {
        CompanyProfile existing = CompanyProfile.createDefault();
        existing.setCompanyName("Ma Société");
        existing.setPrimaryColor("#991b1b");
        existing.setLogoData(VALID_PNG);
        existing.setLogoContentType("image/png");
        existing.setLogoFilename("logo.png");
        existing.setThemeVersion(5L);

        when(repository.findById(CompanyProfile.SINGLETON_ID)).thenReturn(Optional.of(existing));
        when(repository.save(any(CompanyProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CompanyProfileDto afterReset = service.resetThemeToDefaults("admin");
        assertEquals("Ma Société", afterReset.companyName());
        assertEquals(CompanyProfile.DEFAULT_PRIMARY_COLOR, afterReset.primaryColor());
        assertTrue(afterReset.hasLogo());
        assertEquals(6L, afterReset.themeVersion());

        CompanyProfileDto afterDeleteLogo = service.deleteLogo("admin");
        assertFalse(afterDeleteLogo.hasLogo());
        assertNull(afterDeleteLogo.logoUrl());
        assertEquals(7L, afterDeleteLogo.themeVersion());
    }
}
