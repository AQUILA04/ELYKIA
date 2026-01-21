package com.optimize.common.entities.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.optimize.common.entities.enums.State;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

@MappedSuperclass
@EntityListeners({AuditingEntityListener.class})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BaseEntity<T extends Serializable> implements Serializable {


    @Serial
    private static final long serialVersionUID = 1L;
    @CreatedBy
    @Column(
            name = "REG_USER_ID",
            nullable = false,
            length = 50,
            updatable = false
    )
    @JsonIgnore
    protected T createdBy;
    @CreatedDate
    @Column(
            name = "DATE_REG",
            nullable = false
    )
    @JsonIgnore
    protected LocalDateTime createdDate = LocalDateTime.now();
    @LastModifiedBy
    @Column(
            name = "MOD_USER_ID",
            length = 50
    )
    @JsonIgnore
    protected T lastModifiedBy;
    @LastModifiedDate
    @Column(
            name = "DATE_MOD"
    )
    @JsonIgnore
    protected LocalDateTime lastModifiedDate = LocalDateTime.now();
    @JsonIgnore
    @Column(
            name = "visibility",
            nullable = false
    )
    @Enumerated(EnumType.STRING)
    protected @NotNull State state = State.ENABLED;

    @JsonIgnore
    public boolean isDeleted() {
        return State.DELETED.equals(this.state);
    }

}
