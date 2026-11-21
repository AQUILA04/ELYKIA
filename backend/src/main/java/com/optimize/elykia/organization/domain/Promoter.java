package com.optimize.elykia.organization.domain;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
public class Promoter extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String serialNumber;
    private LocalDate dateOfBirth;
    private String phoneNumber;
    /** Clé MinIO de la miniature. Vide si aucune photo n'a été déposée. */
    private String photoObjectKey;

}
