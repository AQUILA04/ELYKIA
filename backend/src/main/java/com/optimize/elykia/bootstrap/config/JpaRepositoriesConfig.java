package com.optimize.elykia.bootstrap.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.envers.repository.support.EnversRevisionRepositoryFactoryBean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.repository.config.BootstrapMode;

/**
 * Configures Spring Data JPA + Envers repositories with a selectable {@link BootstrapMode}.
 * <p>
 * In {@code prod}, {@code elykia.jpa.repositories.bootstrap-mode=lazy} defers instantiating
 * the 140+ Envers-backed repository proxies until first use, shaving ~20 s off cold startup.
 * In {@code test} (and by default when unset), {@link BootstrapMode#DEFAULT} remains active
 * so CI eagerly validates every {@code @Query} across all repositories.
 */
@Configuration
public class JpaRepositoriesConfig {

    @Configuration
    @ConditionalOnProperty(name = "elykia.jpa.repositories.bootstrap-mode", havingValue = "lazy")
    @EnableJpaRepositories(
            basePackages = {"com.optimize.elykia", "com.optimize.common.securities"},
            repositoryFactoryBeanClass = EnversRevisionRepositoryFactoryBean.class,
            bootstrapMode = BootstrapMode.LAZY)
    static class LazyJpaRepositoriesConfig {
    }

    @Configuration
    @ConditionalOnProperty(
            name = "elykia.jpa.repositories.bootstrap-mode",
            havingValue = "default",
            matchIfMissing = true)
    @EnableJpaRepositories(
            basePackages = {"com.optimize.elykia", "com.optimize.common.securities"},
            repositoryFactoryBeanClass = EnversRevisionRepositoryFactoryBean.class,
            bootstrapMode = BootstrapMode.DEFAULT)
    static class DefaultJpaRepositoriesConfig {
    }
}
