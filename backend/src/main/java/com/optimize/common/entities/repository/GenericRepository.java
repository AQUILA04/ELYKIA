package com.optimize.common.entities.repository;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.enums.State;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.NoRepositoryBean;

import java.io.Serializable;
import java.util.List;
import java.util.Optional;

/**
 * Classe générique de base pour les repository
 * @author Francis AHONSU
 * @param <E> l'Entité
 * @param <I> l'identifiant de l'entité
 * @since 0.0.1
 */
@NoRepositoryBean
public interface GenericRepository<E extends BaseEntity<? extends Serializable>, I extends Serializable>
        extends JpaRepository<E, I> , JpaSpecificationExecutor<E> {

    Page<E> findByState(State state, Pageable pageable);
    List<E> findByState(State state);
    Page<E> findByStateNot(State state, Pageable pageable);
    Optional<E> findByIdAndState(I id,State state);

}
