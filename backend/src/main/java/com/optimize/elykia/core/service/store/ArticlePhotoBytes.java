package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.exception.CustomValidationException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public final class ArticlePhotoBytes {

    private ArticlePhotoBytes() {
    }

    public static byte[] read(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomValidationException("La photo est vide.");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new CustomValidationException("La photo n'a pas pu être lue.");
        }
    }
}
