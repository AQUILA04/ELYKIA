package com.optimize.common.securities.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity(name = "refreshtoken")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    // Use ManyToOne so multiple refresh tokens can be associated with the same user
    // (OneToOne creates a unique constraint on the FK column which causes the
    // DB to reject creating a second token for the same user).
    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "USEID")
    private User user;

    @Column(nullable = false)
    private String token;

    @Column(nullable = false)
    private Instant expiryDate;
}

