package com.optimize.elykia.client.storage;

import com.optimize.common.entities.exception.ApplicationException;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

@Service
@Slf4j
public class ThumbnailatorImageProcessingService implements ImageProcessingService {

    @Override
    public byte[] generateThumbnail(byte[] original, int width, int height) {
        if (original == null || original.length == 0) {
            throw new ApplicationException("Format d'image non supporté ou fichier corrompu");
        }
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(original))
                    .size(width, height)
                    .outputFormat("JPEG")
                    .outputQuality(0.8)
                    .toOutputStream(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erreur lors de la génération du thumbnail", e);
            throw new ApplicationException("Format d'image non supporté ou fichier corrompu");
        }
    }
}
