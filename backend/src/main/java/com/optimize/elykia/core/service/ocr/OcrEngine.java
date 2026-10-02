package com.optimize.elykia.core.service.ocr;

/**
 * Pluggable OCR engine. Production uses {@link TesseractCliOcrEngine};
 * a future HTTP sidecar can implement the same contract.
 */
public interface OcrEngine {

    boolean isAvailable();

    /**
     * Extract text from an image (JPEG/PNG bytes). Empty string if nothing readable.
     */
    String extractText(byte[] imageBytes) throws OcrException;
}
