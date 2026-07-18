package com.optimize.elykia.core.util;

import org.springframework.data.domain.Sort;

import java.util.stream.Collectors;

/**
 * Clé de cache SpEL pour Pageable — local au backend (évite T(...) sur une classe
 * absente du JAR common-entities déployé).
 */
public final class PageableCacheKeyHelper {

    private PageableCacheKeyHelper() {
    }

    public static String sortKey(Sort sort) {
        if (sort == null || sort.isUnsorted()) {
            return "unsorted";
        }
        return sort.stream()
                .map(order -> order.getProperty() + ":" + order.getDirection().name())
                .collect(Collectors.joining(","));
    }
}
