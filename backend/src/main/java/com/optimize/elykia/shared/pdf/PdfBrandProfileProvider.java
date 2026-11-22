package com.optimize.elykia.shared.pdf;

/**
 * SPI port in {@code shared.pdf} implemented by the {@code company} module so all PDF generators
 * dynamically consume the configured enterprise profile, color chart, and logo without creating
 * a circular module dependency.
 */
@FunctionalInterface
public interface PdfBrandProfileProvider {

    PdfBrandProfile currentBrand();
}
