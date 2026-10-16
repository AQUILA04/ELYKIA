package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.exception.CustomValidationException;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

/**
 * Réduit une photo d'article ou de type en un seul JPEG.
 * L'original n'est pas conservé.
 */
@Component
@Slf4j
public class ArticlePhotoCompressor {

    public static final int MAX_BYTES = 5 * 1024 * 1024;
    public static final int TARGET_BYTES = 25 * 1024;
    public static final int MAX_EDGE = 320;

    private static final int[] EDGES = {MAX_EDGE, 240, 160};
    private static final double[] QUALITIES = {0.60, 0.45, 0.35};

    public byte[] compress(byte[] original) {
        if (original == null || original.length == 0) {
            throw new CustomValidationException("La photo est vide.");
        }
        if (original.length > MAX_BYTES) {
            throw new CustomValidationException("La photo ne doit pas dépasser 5 Mo.");
        }
        if (!isSupported(original)) {
            throw new CustomValidationException("La photo doit être au format JPEG, PNG ou WebP.");
        }
        byte[] smallest = null;
        for (int edge : EDGES) {
            for (double quality : QUALITIES) {
                byte[] jpeg = render(original, edge, quality);
                smallest = jpeg;
                if (jpeg.length <= TARGET_BYTES) {
                    return jpeg;
                }
            }
        }
        return smallest;
    }

    static boolean isSupported(byte[] data) {
        if (data.length >= 3
                && (data[0] & 0xFF) == 0xFF
                && (data[1] & 0xFF) == 0xD8
                && (data[2] & 0xFF) == 0xFF) {
            return true;
        }
        if (data.length >= 8
                && (data[0] & 0xFF) == 0x89
                && data[1] == 0x50
                && data[2] == 0x4E
                && data[3] == 0x47) {
            return true;
        }
        return data.length >= 12
                && data[0] == 'R'
                && data[1] == 'I'
                && data[2] == 'F'
                && data[3] == 'F'
                && data[8] == 'W'
                && data[9] == 'E'
                && data[10] == 'B'
                && data[11] == 'P';
    }

    private byte[] render(byte[] original, int edge, double quality) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(original))
                    .size(edge, edge)
                    .outputFormat("JPEG")
                    .outputQuality(quality)
                    .toOutputStream(output);
            return output.toByteArray();
        } catch (Exception e) {
            log.warn("Réduction de photo impossible: {}", e.getMessage());
            throw new CustomValidationException("Format d'image non supporté ou fichier corrompu.");
        }
    }
}
