package com.optimize.elykia.core.config;

public final class CacheNames {

    public static final String PROMOTERS = "promoters";
    public static final String ARTICLES_ENABLED_LIST = "articles-enabled-list";
    public static final String ARTICLES_ALL_LIST = "articles-all-list";
    public static final String ARTICLES_PAGE = "articles-page";
    public static final String ARTICLES_ENABLED_PAGE = "articles-enabled-page";

    public static final String[] ARTICLE_LIST_CACHES = {
            ARTICLES_ENABLED_LIST,
            ARTICLES_ALL_LIST,
            ARTICLES_PAGE,
            ARTICLES_ENABLED_PAGE
    };

    private CacheNames() {
    }
}
