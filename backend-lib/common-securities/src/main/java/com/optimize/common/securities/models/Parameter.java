package com.optimize.common.securities.models;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "PARAMETERS", uniqueConstraints = {
    @UniqueConstraint(columnNames = "PARKEY")
})
@Getter
@Setter
public class Parameter extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PARID")
    private Long id;

    @NotBlank
    @Column(name = "PARKEY", nullable = false)
    private String key;

    @Column(name = "PARVAL")
    private String value;

    @Column(name = "PARDESC")
    private String description;
}
