package com.optimize.elykia.core.service.stock;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.StockEntry;
import com.optimize.elykia.core.dto.stock.PackagingEntryResolution;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticlePackagingType;
import com.optimize.elykia.core.enumaration.StockEntryPackagingMode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ArticlePackagingPricingServiceTest {

    private ArticlePackagingPricingService service;
    private Articles article;

    @BeforeEach
    void setUp() {
        service = new ArticlePackagingPricingService();
        article = new Articles();
        article.setId(1L);
        article.setPackagingType(ArticlePackagingType.CARTON);
        article.setUnitsPerPackage(24);
        article.setWholesalePurchasePrice(5000.0);
        article.setHalfWholesalePurchasePrice(2700.0);
        article.setPurchasePrice(208.0);
    }

    @Test
    void resolveFifoEntry_Wholesale_ComputesQuantityAndUnitPrice() {
        StockEntry entry = new StockEntry();
        entry.setArticleId(1L);
        entry.setEntryPackagingMode(StockEntryPackagingMode.WHOLESALE);
        entry.setPackageCount(3);
        entry.setPackagePrice(5000.0);

        PackagingEntryResolution resolved = service.resolveFifoEntry(article, entry);

        assertThat(resolved.quantity()).isEqualTo(72);
        assertThat(resolved.unitPrice()).isEqualTo(208.33);
        assertThat(resolved.totalPrice()).isEqualTo(15000.0);
        assertThat(resolved.entryPackagingMode()).isEqualTo(StockEntryPackagingMode.WHOLESALE);
        assertThat(resolved.packageCount()).isEqualTo(3);
        assertThat(resolved.packagingTypeSnapshot()).isEqualTo(ArticlePackagingType.CARTON);
        assertThat(resolved.unitsPerPackageSnapshot()).isEqualTo(24);
    }

    @Test
    void resolveFifoEntry_HalfWholesale_ComputesFromHalfPackage() {
        StockEntry entry = new StockEntry();
        entry.setArticleId(1L);
        entry.setEntryPackagingMode(StockEntryPackagingMode.HALF_WHOLESALE);
        entry.setPackageCount(1);
        entry.setPackagePrice(2700.0);

        PackagingEntryResolution resolved = service.resolveFifoEntry(article, entry);

        assertThat(resolved.quantity()).isEqualTo(12);
        assertThat(resolved.unitPrice()).isEqualTo(225.0);
        assertThat(resolved.totalPrice()).isEqualTo(2700.0);
        assertThat(resolved.entryPackagingMode()).isEqualTo(StockEntryPackagingMode.HALF_WHOLESALE);
    }

    @Test
    void resolveFifoEntry_Unit_UsesPayloadQuantityAndPrice() {
        StockEntry entry = new StockEntry();
        entry.setArticleId(1L);
        entry.setEntryPackagingMode(StockEntryPackagingMode.UNIT);
        entry.setQuantity(10);
        entry.setUnitPrice(200.0);

        PackagingEntryResolution resolved = service.resolveFifoEntry(article, entry);

        assertThat(resolved.quantity()).isEqualTo(10);
        assertThat(resolved.unitPrice()).isEqualTo(200.0);
        assertThat(resolved.totalPrice()).isEqualTo(2000.0);
        assertThat(resolved.entryPackagingMode()).isEqualTo(StockEntryPackagingMode.UNIT);
        assertThat(resolved.packageCount()).isNull();
    }

    @Test
    void resolveFifoEntry_WholesaleWithoutPackaging_Throws() {
        article.setPackagingType(ArticlePackagingType.NONE);
        article.setUnitsPerPackage(null);

        StockEntry entry = new StockEntry();
        entry.setEntryPackagingMode(StockEntryPackagingMode.WHOLESALE);
        entry.setPackageCount(1);
        entry.setPackagePrice(1000.0);

        assertThatThrownBy(() -> service.resolveFifoEntry(article, entry))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("packaging");
    }

    @Test
    void validateArticlePackaging_OddUnits_Throws() {
        article.setUnitsPerPackage(25);

        assertThatThrownBy(() -> service.validateArticlePackaging(article))
                .isInstanceOf(CustomValidationException.class)
                .hasMessageContaining("pair");
    }

    @Test
    void validateArticlePackaging_None_AllowsMissingUnits() {
        article.setPackagingType(ArticlePackagingType.NONE);
        article.setUnitsPerPackage(null);

        service.validateArticlePackaging(article);
    }
}
