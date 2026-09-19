package com.optimize.elykia.core.entity.agency;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "agency", uniqueConstraints = @UniqueConstraint(name = "uq_agency_code", columnNames = "code"))
@Getter
@Setter
public class Agency extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    private String phone;
    private String secretaryName;
    private String secretaryContact;
    private String superviserName;
    private String superviserContact;

    @Column(nullable = false, columnDefinition = "boolean DEFAULT true")
    private boolean active = true;

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    @Column(name = "deactivated_by")
    private String deactivatedBy;

    @PrePersist
    protected void ensureActiveDefault() {
        // active defaults to true; BaseEntity sets DATE_REG via auditing
        if (this.code != null) {
            this.code = this.code.trim();
        }
    }
}
