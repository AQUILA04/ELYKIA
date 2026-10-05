package com.optimize.elykia.core.service.ocr;

import com.optimize.elykia.core.config.PaymentProofProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TesseractCliOcrEngineTest {

    private PaymentProofProperties properties;
    private TesseractCliOcrEngine engine;

    @BeforeEach
    void setUp() {
        properties = new PaymentProofProperties();
        properties.getOcr().setTesseractBinary("tesseract-binary-absent-for-unit-tests");
        properties.getOcr().setMaxConcurrent(1);
        properties.getOcr().setTimeoutSeconds(1);
        engine = new TesseractCliOcrEngine(properties);
        engine.init();
    }

    @Test
    void init_marksUnavailableWhenBinaryMissing() {
        assertThat(engine.isAvailable()).isFalse();
    }

    @Test
    void extractText_throwsWhenUnavailable() {
        assertThatThrownBy(() -> engine.extractText(new byte[]{1, 2, 3}))
                .isInstanceOf(OcrException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void ocrException_preservesCause() {
        RuntimeException cause = new RuntimeException("boom");
        OcrException ex = new OcrException("wrapper", cause);
        assertThat(ex.getMessage()).isEqualTo("wrapper");
        assertThat(ex.getCause()).isSameAs(cause);
    }
}
