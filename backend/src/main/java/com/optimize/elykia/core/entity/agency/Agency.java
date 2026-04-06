package com.optimize.elykia.core.entity.agency;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Agency extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String code;
    private String phone;
    private String secretaryName;
    private String secretaryContact;
    private String superviserName;
    private String superviserContact;
}
