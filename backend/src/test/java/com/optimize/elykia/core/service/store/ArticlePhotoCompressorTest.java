package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.exception.CustomValidationException;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ArticlePhotoCompressorTest {

    private final ArticlePhotoCompressor compressor = new ArticlePhotoCompressor();

    @Test
    void compress_largePngBecomesSmallJpeg() throws IOException {
        byte[] png = largePng();
        assertTrue(png.length > 500_000, "le PNG de test doit peser plusieurs centaines de Ko");
        assertTrue(png.length <= ArticlePhotoCompressor.MAX_BYTES);

        byte[] jpeg = compressor.compress(png);

        assertTrue(jpeg.length <= ArticlePhotoCompressor.TARGET_BYTES, "jpeg=" + jpeg.length);
        assertTrue(jpeg.length > 0);
        assertEquals((byte) 0xFF, jpeg[0]);
        assertEquals((byte) 0xD8, jpeg[1]);
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(jpeg));
        assertTrue(image.getWidth() <= ArticlePhotoCompressor.MAX_EDGE);
        assertTrue(image.getHeight() <= ArticlePhotoCompressor.MAX_EDGE);
    }

    @Test
    void compress_rejectsFileOverFiveMegabytes() {
        byte[] tooBig = new byte[ArticlePhotoCompressor.MAX_BYTES + 1];
        tooBig[0] = (byte) 0xFF;
        tooBig[1] = (byte) 0xD8;
        tooBig[2] = (byte) 0xFF;

        CustomValidationException error = assertThrows(CustomValidationException.class, () -> compressor.compress(tooBig));
        assertTrue(error.getMessage().contains("5 Mo"));
    }

    @Test
    void compress_rejectsNonImage() {
        assertThrows(CustomValidationException.class, () -> compressor.compress(new byte[] {1, 2, 3, 4, 5}));
        assertThrows(CustomValidationException.class, () -> compressor.compress("GIF89a-not-an-image".getBytes()));
    }

    private static byte[] largePng() throws IOException {
        int width = 2200;
        int height = 1600;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setPaint(new GradientPaint(0, 0, new Color(30, 64, 175), width, height, new Color(250, 204, 21)));
        graphics.fillRect(0, 0, width, height);
        graphics.setColor(new Color(220, 38, 38));
        graphics.fillOval(200, 300, 900, 700);
        graphics.dispose();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
