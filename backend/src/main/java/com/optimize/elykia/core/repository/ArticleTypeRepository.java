package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.article.ArticleType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArticleTypeRepository extends GenericRepository<ArticleType, Long> {
    Optional<ArticleType> findByName(String name);

    List<ArticleType> findByNameIn(Collection<String> names);

    default Page<ArticleType> searchEnabled(String keyword, Pageable pageable) {
        String pattern = "%" + keyword.trim().toLowerCase() + "%";
        Specification<ArticleType> spec = (root, query, cb) -> cb.and(
                cb.equal(root.get("state"), State.ENABLED),
                cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("code")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("description"), cb.literal(""))), pattern)
                )
        );
        return findAll(spec, pageable);
    }
}
