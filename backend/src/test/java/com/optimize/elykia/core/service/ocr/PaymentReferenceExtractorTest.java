package com.optimize.elykia.core.service.ocr;

import com.optimize.elykia.core.config.PaymentProofProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentReferenceExtractorTest {

    private PaymentReferenceExtractor extractor;

    @BeforeEach
    void setUp() {
        PaymentProofProperties properties = new PaymentProofProperties();
        extractor = new PaymentReferenceExtractor(properties);
    }

    @Test
    void extractsReferenceAfterKeyword() {
        String text = "Mixx by YAS\nTransfert réussi\nRéférence : TXN-20260617-ABCD\nMontant 35000";
        assertThat(extractor.extract(text)).isEqualTo("TXN-20260617-ABCD");
    }

    @Test
    void extractsMoovStyleNumericId() {
        String text = "Moov Money\nID Transaction: 98765432101234\nMontant: 20000 FCFA";
        assertThat(extractor.extract(text)).isEqualTo("98765432101234");
    }

    @Test
    void extractsPrefixedAlphanumericToken() {
        String text = "Confirmation\nMM-240617-9988\nStatut OK";
        assertThat(extractor.extract(text)).isEqualTo("MM-240617-9988");
    }

    @Test
    void returnsNullWhenNoCandidate() {
        assertThat(extractor.extract("Aucun numéro utile ici")).isNull();
        assertThat(extractor.extract(null)).isNull();
        assertThat(extractor.extract("")).isNull();
    }

    @Test
    void ignoresShortTokens() {
        String text = "Ref: AB12";
        assertThat(extractor.extract(text)).isNull();
    }
}
