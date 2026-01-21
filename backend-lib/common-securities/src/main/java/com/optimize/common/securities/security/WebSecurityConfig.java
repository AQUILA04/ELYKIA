package com.optimize.common.securities.security;

import org.springframework.beans.factory.ObjectProvider; // Import ObjectProvider
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.optimize.common.securities.security.jwt.AuthEntryPointJwt;
import com.optimize.common.securities.security.jwt.AuthTokenFilter;
import com.optimize.common.securities.security.services.UserDetailsServiceImpl;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class WebSecurityConfig {

    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    // Inject ObjectProvider for PasswordEncoder
    @Autowired
    private ObjectProvider<PasswordEncoder> passwordEncoderProvider; // NEW INJECTION

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        // Use the ObjectProvider to get the PasswordEncoder lazily
        authProvider.setPasswordEncoder(passwordEncoderProvider.getObject()); // MODIFIED LINE
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    @Lazy
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Bean pour la configuration CORS.
     * C'est ici que vous définissez quelles origines, méthodes et en-têtes sont autorisés.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Autoriser l'origine de votre application frontend
        configuration.setAllowedOrigins(List.of("*"));
        // Autoriser les méthodes HTTP courantes
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // Autoriser les en-têtes spécifiques
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Cache-Control"));
        // Permettre l'envoi de credentials (comme les cookies ou les tokens d'authentification)
        //configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Appliquer cette configuration à toutes les routes de l'API
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // Activer CORS en utilisant la configuration définie dans le bean corsConfigurationSource()
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Désactiver CSRF car nous utilisons un mécanisme stateless (JWT)
            .csrf(AbstractHttpConfigurer::disable)
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth ->
                auth.requestMatchers("/api/auth/**",
                                "/i18n/**",
                                "/content/**",
                                "/v3/api-docs/swagger-config/**",
                                "/v3/api-docs/**",
                                "/v2/api-docs/**",
                                "/",
                                "/swagger-ui/**",
                                "/apidoc/**",
                                "/swagger-resources/**",
                                "/actuator/**", // L'accès à l'actuator est maintenant autorisé
                                "/api/v1/**",
                                "/api/licences/**",
                                "/api/parameters/**",
                                "/swagger-ui.html").permitAll()
                    .requestMatchers("/api/test/**").permitAll()
                    .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}