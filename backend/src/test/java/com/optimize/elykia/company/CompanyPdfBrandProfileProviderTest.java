package com.optimize.elykia.company;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.optimize.elykia.company.application.CompanyPdfBrandProfileProvider;
import com.optimize.elykia.company.application.CompanyProfileService;
import com.optimize.elykia.company.domain.CompanyLogoAsset;
import com.optimize.elykia.company.domain.CompanyProfile;
import com.optimize.elykia.company.web.dto.CompanyProfileDto;
import com.optimize.elykia.shared.pdf.PdfBrandProfile;
import com.optimize.elykia.shared.pdf.PdfDocumentIdentity;
import com.optimize.elykia.shared.pdf.PdfHtmlRenderer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompanyPdfBrandProfileProviderTest {

    // 1x1 transparent PNG
    private static final byte[] ONE_PIXEL_PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");

    @Mock
    private CompanyProfileService companyProfileService;

    @AfterEach
    void tearDown() {
        PdfDocumentIdentity.resetProvider();
    }

    @Test
    void mapsCompanyProfileAndPngLogoIntoDynamicPdfTemplatesAndRenderer() throws IOException {
        CompanyProfile entity = CompanyProfile.createDefault();
        entity.setCompanyName("MICROFINANCE SOLEIL SA");
        entity.setShortName("SOLEIL");
        entity.setAddress("Boulevard du 13 Janvier, Lomé");
        entity.setPhone("90112233");
        entity.setPrimaryColor("#065f46");
        entity.setSecondaryColor("#0d9488");
        entity.setAccentColor("#f59e0b");
        entity.setLogoData(ONE_PIXEL_PNG);
        entity.setLogoContentType("image/png");
        entity.setLogoFilename("soleil.png");
        entity.setThemeVersion(7L);

        when(companyProfileService.getCurrentProfile()).thenReturn(CompanyProfileDto.fromEntity(entity));
        when(companyProfileService.getCurrentLogo()).thenReturn(Optional.of(
                new CompanyLogoAsset(ONE_PIXEL_PNG, "image/png", "soleil.png", 7L)));

        CompanyPdfBrandProfileProvider provider = new CompanyPdfBrandProfileProvider(companyProfileService);
        PdfDocumentIdentity.registerProvider(provider);

        PdfBrandProfile resolved = PdfDocumentIdentity.current();
        assertThat(resolved.companyName()).isEqualTo("MICROFINANCE SOLEIL SA");
        assertThat(resolved.address()).isEqualTo("Boulevard du 13 Janvier, Lomé");
        assertThat(resolved.phoneDisplay()).isEqualTo("90 11 22 33");
        assertThat(resolved.safePrimaryHex()).isEqualTo("#065f46");
        assertThat(resolved.logoDataUri()).startsWith("data:image/png;base64,");
        assertThat(resolved.brandInitial()).isEqualTo("M");
        assertThat(PdfDocumentIdentity.footerLabel("Rapport mensuel"))
                .isEqualTo("MICROFINANCE SOLEIL SA  |  Rapport mensuel");

        // Render fragments.html with Thymeleaf & convert to real PDF via iText
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);

        Context ctx = new Context();
        PdfDocumentIdentity.applyTo(ctx, "Fiche Client");
        String stylesHtml = engine.process("pdf/fragments", java.util.Set.of("styles"), ctx);
        String headerHtml = engine.process("pdf/fragments", java.util.Set.of("header"), ctx);

        // Ensure Thymeleaf CSS inlining emitted valid unquoted hex colors
        assertThat(stylesHtml).contains("background-color: #065f46;");
        assertThat(stylesHtml).doesNotContain("'#065f46'");
        assertThat(headerHtml).contains("MICROFINANCE SOLEIL SA");
        assertThat(headerHtml).contains("data:image/png;base64,");

        String docHtml = "<!DOCTYPE html><html><head>" + stylesHtml + "</head><body>" + headerHtml + "</body></html>";
        byte[] pdfBytes = new PdfHtmlRenderer().htmlToPdf(docHtml, PdfDocumentIdentity.footerLabel("Fiche Client"));

        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(1);
            String pageText = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            assertThat(pageText).contains("MICROFINANCE SOLEIL SA");
            assertThat(pageText).contains("Boulevard du 13 Janvier, Lomé");
            assertThat(pageText).contains("90 11 22 33");
            assertThat(pageText).contains("1/1");
        }
    }

    @Test
    void skipsWebpDataUriForItextCompatibilityWhileKeepingBrandMetadata() {
        CompanyProfile entity = CompanyProfile.createDefault();
        entity.setCompanyName("GROUPE ATLAS");
        entity.setLogoData(new byte[]{'R', 'I', 'F', 'F', 1, 2, 3, 4, 'W', 'E', 'B', 'P'});
        entity.setLogoContentType("image/webp");
        entity.setLogoFilename("atlas.webp");

        when(companyProfileService.getCurrentProfile()).thenReturn(CompanyProfileDto.fromEntity(entity));
        when(companyProfileService.getCurrentLogo()).thenReturn(Optional.of(
                new CompanyLogoAsset(entity.getLogoData(), "image/webp", "atlas.webp", 2L)));

        CompanyPdfBrandProfileProvider provider = new CompanyPdfBrandProfileProvider(companyProfileService);
        PdfBrandProfile brand = provider.currentBrand();

        assertThat(brand.companyName()).isEqualTo("GROUPE ATLAS");
        assertThat(brand.logoDataUri()).isNull();
        assertThat(brand.brandInitial()).isEqualTo("G");
        assertThat(brand.address()).isNull();
    }
}
