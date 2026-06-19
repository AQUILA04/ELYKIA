package com.optimize.elykia.core.entity.customer;

import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "customer_user_mapping")
@Getter
@Setter
@NoArgsConstructor
public class CustomerUserMapping extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false, unique = true)
    private Long clientId;

    @Column(nullable = false, unique = true, length = 20)
    private String username;
}
