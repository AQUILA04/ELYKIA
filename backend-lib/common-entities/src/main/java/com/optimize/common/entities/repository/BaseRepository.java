package com.optimize.common.entities.repository;

import com.optimize.common.entities.entity.BaseEntity;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.history.RevisionRepository;

import java.io.Serializable;

/**
 * @author Francis AHONSU
 *
 * @since 0.0.1
 */
@NoRepositoryBean
public interface BaseRepository<E extends BaseEntity<?>, I extends Serializable, J extends Number & Comparable<J>> extends RevisionRepository<E, I, J>,  GenericRepository<E, I> {
}
