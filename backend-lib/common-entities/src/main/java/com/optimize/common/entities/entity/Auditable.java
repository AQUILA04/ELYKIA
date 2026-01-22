package com.optimize.common.entities.entity;

import jakarta.persistence.MappedSuperclass;
import org.hibernate.envers.Audited;

import java.io.Serializable;

@Audited
@MappedSuperclass
public class Auditable<T extends Serializable> extends BaseEntity<T>{

}
