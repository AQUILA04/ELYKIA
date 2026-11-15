package com.optimize.elykia.core.service.commercial;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.core.entity.Promoter;
import com.optimize.elykia.core.repository.PromoterRepository;
import com.optimize.elykia.core.service.store.ArticlePhotoCompressor;
import com.optimize.elykia.core.service.store.ArticlePhotoUrlService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommercialStaffPhotoService {

    private final PromoterRepository promoterRepository;
    private final ArticlePhotoCompressor compressor;
    private final ArticlePhotoUrlService urlService;
    private final MinioStorageService minioStorageService;
    private final MinioProperties minioProperties;

    @Transactional
    public Promoter upload(Long id, byte[] bytes) {
        Promoter person = require(id);
        byte[] thumb = compressor.compress(bytes);
        byte[] original = originalJpeg(bytes);
        String thumbKey = CommercialStaffPhotoKeys.thumb(id);
        String originalKey = CommercialStaffPhotoKeys.original(id);
        String bucket = bucket();
        minioStorageService.uploadObject(bucket, originalKey, original, "image/jpeg");
        minioStorageService.uploadObject(bucket, thumbKey, thumb, "image/jpeg");
        person.setPhotoObjectKey(thumbKey);
        urlService.evict(thumbKey);
        urlService.evict(originalKey);
        return promoterRepository.save(person);
    }

    @Transactional
    public Promoter delete(Long id) {
        Promoter person = require(id);
        removeQuietly(CommercialStaffPhotoKeys.thumb(id));
        removeQuietly(CommercialStaffPhotoKeys.original(id));
        if (StringUtils.hasText(person.getPhotoObjectKey())) {
            urlService.evict(person.getPhotoObjectKey());
        }
        person.setPhotoObjectKey(null);
        return promoterRepository.save(person);
    }

    public String presign(String objectKey) {
        return urlService.presign(objectKey);
    }

    private Promoter require(Long id) {
        return promoterRepository.findById(id)
                .filter(person -> !person.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }

    private byte[] originalJpeg(byte[] original) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(original))
                    .size(1024, 1024)
                    .outputFormat("JPEG")
                    .outputQuality(0.82)
                    .toOutputStream(output);
            return output.toByteArray();
        } catch (Exception e) {
            log.warn("Préparation de la photo de profil impossible: {}", e.getMessage());
            throw new CustomValidationException("Format d'image non supporté ou fichier corrompu.");
        }
    }

    private void removeQuietly(String objectKey) {
        try {
            if (minioStorageService.objectExists(bucket(), objectKey)) {
                minioStorageService.deleteObject(bucket(), objectKey);
            }
        } catch (Exception e) {
            log.warn("Suppression de la photo {} impossible: {}", objectKey, e.getMessage());
        }
        urlService.evict(objectKey);
    }

    private String bucket() {
        return minioProperties.getArticlesBucket();
    }
}
