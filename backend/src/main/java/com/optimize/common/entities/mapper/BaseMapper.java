package com.optimize.common.entities.mapper;

import com.optimize.common.entities.entity.BaseEntity;

public interface BaseMapper<E extends BaseEntity<?>, D> {
    E toEntity(D dto);
    D toDto(E entity);

}
