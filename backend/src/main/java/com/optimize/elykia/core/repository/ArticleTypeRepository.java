package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.ArticleType;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ArticleTypeRepository extends GenericRepository<ArticleType, Long> {
    Optional<ArticleType> findByName(String name);
}
