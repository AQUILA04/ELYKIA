package com.optimize.common.entities.mapper;

import com.optimize.common.entities.entity.BaseEntity;

public abstract class GenericMapper<E extends BaseEntity<?>, D> {
    abstract E toEntity(D dto);
    abstract D toDto(E entity);
}
