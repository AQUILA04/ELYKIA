package com.optimize.common.securities.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Defines password encoding independently from the web security graph.
 *
 * <p>Keeping this bean outside {@link WebSecurityConfig} prevents a cycle where
 * a user-account service needs a {@code PasswordEncoder} while the web-security
 * configuration itself eagerly needs the user-details service.</p>
 */
@Configuration
public class PasswordEncoderConfiguration {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
