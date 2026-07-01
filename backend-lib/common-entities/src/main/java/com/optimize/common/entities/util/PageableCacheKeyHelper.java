package com.optimize.common.entities.util;

import org.springframework.data.domain.Sort;

import java.util.stream.Collectors;

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
