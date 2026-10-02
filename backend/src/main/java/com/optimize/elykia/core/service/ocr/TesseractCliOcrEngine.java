package com.optimize.elykia.core.service.ocr;

import com.optimize.elykia.core.config.PaymentProofProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Runs the system {@code tesseract} binary via {@link ProcessBuilder}
 * (no JNA / tess4j — avoids native crashes inside the JVM).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TesseractCliOcrEngine implements OcrEngine {

    private final PaymentProofProperties properties;
    private final AtomicBoolean available = new AtomicBoolean(false);
    private Semaphore concurrency;

    @PostConstruct
    void init() {
        PaymentProofProperties.Ocr ocr = properties.getOcr();
        concurrency = new Semaphore(Math.max(1, ocr.getMaxConcurrent()));
        available.set(probeBinary(ocr.getTesseractBinary()));
        if (!available.get()) {
            log.warn("Tesseract binary '{}' not found — payment proof OCR will return UNAVAILABLE",
                    ocr.getTesseractBinary());
        } else {
            log.info("Tesseract OCR ready (binary={}, langs={}, maxConcurrent={})",
                    ocr.getTesseractBinary(), ocr.getLanguages(), ocr.getMaxConcurrent());
        }
    }

    @Override
    public boolean isAvailable() {
        return available.get();
    }

    @Override
    public String extractText(byte[] imageBytes) throws OcrException {
        if (!available.get()) {
            throw new OcrException("Tesseract is not available on this host");
        }
        if (imageBytes == null || imageBytes.length == 0) {
            return "";
        }

        PaymentProofProperties.Ocr ocr = properties.getOcr();
        boolean acquired;
        try {
            acquired = concurrency.tryAcquire(ocr.getTimeoutSeconds(), TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new OcrException("OCR interrupted while waiting for a slot", e);
        }
        if (!acquired) {
            throw new OcrException("OCR concurrency limit reached");
        }

        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("elykia-ocr-");
            Path inputPng = tempDir.resolve("input.png");
            byte[] prepared = preprocessToPng(imageBytes);
            Files.write(inputPng, prepared);

            Path outputBase = tempDir.resolve("out");
            List<String> command = new ArrayList<>();
            command.add(ocr.getTesseractBinary());
            command.add(inputPng.toAbsolutePath().toString());
            command.add(outputBase.toAbsolutePath().toString());
            command.add("-l");
            command.add(ocr.getLanguages());
            command.add("--psm");
            command.add("6");

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(ocr.getTimeoutSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new OcrException("OCR timed out after " + ocr.getTimeoutSeconds() + "s");
            }
            String processOut = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            if (process.exitValue() != 0) {
                throw new OcrException("Tesseract failed (exit=" + process.exitValue() + "): " + processOut);
            }
            Path txt = tempDir.resolve("out.txt");
            if (!Files.exists(txt)) {
                return "";
            }
            return Files.readString(txt, StandardCharsets.UTF_8).trim();
        } catch (OcrException e) {
            throw e;
        } catch (Exception e) {
            throw new OcrException("OCR failed: " + e.getMessage(), e);
        } finally {
            concurrency.release();
            if (tempDir != null) {
                deleteRecursively(tempDir);
            }
        }
    }

    private byte[] preprocessToPng(byte[] imageBytes) throws IOException {
        BufferedImage source;
        try (InputStream in = new ByteArrayInputStream(imageBytes)) {
            source = ImageIO.read(in);
        }
        if (source == null) {
            throw new IOException("Unsupported or corrupt image for OCR");
        }

        int width = source.getWidth();
        int height = source.getHeight();
        int minWidth = Math.max(1, properties.getOcr().getMinWidthPx());
        double scale = width < minWidth ? 2.0 : 1.0;
        int targetW = (int) Math.round(width * scale);
        int targetH = (int) Math.round(height * scale);

        BufferedImage gray = new BufferedImage(targetW, targetH, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = gray.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, targetW, targetH);
            g.drawImage(source, 0, 0, targetW, targetH, null);
        } finally {
            g.dispose();
        }

        Path tmp = Files.createTempFile("elykia-ocr-pre-", ".png");
        try {
            ImageIO.write(gray, "png", tmp.toFile());
            return Files.readAllBytes(tmp);
        } finally {
            Files.deleteIfExists(tmp);
        }
    }

    private static boolean probeBinary(String binary) {
        try {
            Process process = new ProcessBuilder(binary, "--version").redirectErrorStream(true).start();
            boolean finished = process.waitFor(5, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return false;
            }
            return process.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private static void deleteRecursively(Path root) {
        try {
            if (Files.isDirectory(root)) {
                try (var stream = Files.list(root)) {
                    stream.forEach(TesseractCliOcrEngine::deleteRecursively);
                }
            }
            Files.deleteIfExists(root);
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }
}
