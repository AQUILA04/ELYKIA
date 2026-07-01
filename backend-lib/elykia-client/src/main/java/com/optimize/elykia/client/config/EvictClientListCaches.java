package com.optimize.elykia.client.config;

import org.springframework.cache.annotation.CacheEvict;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@CacheEvict(
        cacheNames = {
                ClientCacheNames.CLIENTS_BY_COMMERCIAL_PAGE,
                ClientCacheNames.CLIENTS_PAGE
        },
        allEntries = true,
        beforeInvocation = true
)
public @interface EvictClientListCaches {
}
