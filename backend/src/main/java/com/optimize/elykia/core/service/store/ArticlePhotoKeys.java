package com.optimize.elykia.core.service.store;

public final class ArticlePhotoKeys {

    private ArticlePhotoKeys() {
    }

    public static String article(Long id) {
        return "articles/" + id + ".jpg";
    }

    public static String type(Long id) {
        return "article-types/" + id + ".jpg";
    }
}
