package com.optimize.elykia.core.entity.customer;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "commercial_mobile_money_config")
@Getter
@Setter
public class CommercialMobileMoneyConfig extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "commercial_username", nullable = false, unique = true, length = 50)
    private String commercialUsername;

    @Column(name = "mixx_number", length = 20)
    private String mixxNumber;

    @Column(name = "moov_number", length = 20)
    private String moovNumber;
}
