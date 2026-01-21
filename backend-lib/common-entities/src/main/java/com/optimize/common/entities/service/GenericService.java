package com.optimize.common.entities.service;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.finder.BaseFinder;
import lombok.Getter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.repository.GenericRepository;

import java.io.Serializable;
import java.nio.file.ReadOnlyFileSystemException;
import java.util.List;
import java.util.Optional;

import static com.optimize.common.entities.config.Constants.*;

@Transactional
@Getter
public abstract class GenericService<E extends BaseEntity<?>, I extends Serializable> {
    protected final GenericRepository<E, I> repository;

    protected GenericService(GenericRepository<E, I> repository) {
        this.repository = repository;
    }

    @Transactional
    public E create(E e) {
        return repository.save(e);
    }

    @Transactional
    public E update(E e) {
        return repository.saveAndFlush(e);
    }


    public List<E> getAll() {
        return repository.findByState(State.ENABLED);
    }

    public Page<E> search(BaseFinder<E> finder, Pageable pageable) {
        return repository.findAll(finder.getCriteres(), pageable);
    }
    public Page<E> getAll(Pageable pageable) {
        return repository.findByState(State.ENABLED, pageable);
    }

    public Optional<E> getOne(I id) {
        return repository.findById(id);
    }

    public E getById(I id) {
        return getOne(id).orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }
    public Optional<E> findByIdAndState(I id,State state)
    {
        if (state == null) {
            throw new ApplicationException(ERROR_STATE_NULL);
        }
        return repository.findByIdAndState(id,state);
    }
    public Page<E> findByStateNot(State state, Pageable p) throws ApplicationException {
        if (state == null) {
            throw new ApplicationException(ERROR_STATE_NULL);
        } else {
            return this.repository.findByStateNot(state, p);
        }
    }

    public Page<E> findByState(State state, Pageable p) throws ApplicationException {
        if (state == null) {
            throw new ApplicationException(ERROR_STATE_NULL);
        } else {
            return this.repository.findByState(state, p);
        }
    }
    public List<E> findByState(State state) {
        if (state == null) {
            throw new ApplicationException(ERROR_STATE_NULL);
        } else {
            return this.repository.findByState(state);
        }
    }
    @Transactional
    public boolean enabled(I id) throws ApplicationException {
        Optional<E> op = this.getOne(id);
        if (op.isPresent()) {
            E e = op.get();
            e.setState(State.ENABLED);
            this.repository.saveAndFlush(e);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean disabled(I id) throws ApplicationException {
        Optional<E> op = this.getOne(id);
        if (op.isPresent()) {
            E e = op.get();
            e.setState(State.DISABLED);
            this.repository.saveAndFlush(e);
            return true;
        }
        return false;
    }

    public boolean deleteSoft(I id) throws ApplicationException {
        Optional<E> op = this.getOne(id);
        if (op.isPresent()) {
            E e = op.get();
            e.setState(State.DELETED);
            this.repository.saveAndFlush(e);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean changeState(I id, State state) throws ApplicationException {
        return switch (state) {
            case ENABLED -> this.enabled(id);
            case DISABLED -> this.disabled(id);
            case DELETED -> this.deleteSoft(id);
            default -> throw new ApplicationException("Bad State Value");
        };
    }

    public long count() {
        return this.repository.count();
    }

    public boolean isExist(I id) {
            return repository.existsById(id);
    }
}
