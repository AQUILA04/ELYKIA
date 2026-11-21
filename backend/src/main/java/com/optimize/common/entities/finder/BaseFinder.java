package com.optimize.common.entities.finder;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.jpa.domain.Specification;

@Getter
@Setter
public abstract class BaseFinder<T> {

    public abstract Specification<T> getCriteres();
}
