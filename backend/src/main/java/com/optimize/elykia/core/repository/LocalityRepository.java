package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.Locality;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;


public interface LocalityRepository extends GenericRepository<Locality, Long> {

    default Page<Locality> elasticsearch(String keyword, Pageable pageable) {
        return findAll(getElasticsearchCriteria(keyword), pageable);
    }

    boolean existsByName(String localityName);

    Optional<Locality> findFirstByNameIgnoreCaseAndStateNot(String name, State state);

    default Specification<Locality> getElasticsearchCriteria(String keyword) {
        final String searchKeyword = String.format("%%%s%%", keyword.toLowerCase());
        return (root, query, cb) -> {
            jakarta.persistence.criteria.Predicate p = cb.or(
                    cb.like(cb.lower(root.get("name")), searchKeyword)
            );
            return cb.and(p, cb.notEqual(root.get("state"), State.DELETED));
        };
    }
}
