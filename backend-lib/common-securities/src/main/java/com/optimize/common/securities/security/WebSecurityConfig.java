package com.optimize.common.securities.security;

import org.springframework.beans.factory.ObjectProvider; // Import ObjectProvider
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpMethod;
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

    @Value(value = "${security.config.allow-origin:http://localhost:4200}")
    private String allowedOrigin = "http://localhost:4200"; // Remplacez par l'URL de votre frontend

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
        List<String> allowedOrigins = Arrays.asList(allowedOrigin.split(","));
        configuration.setAllowedOrigins(allowedOrigins.stream().map(String::trim).toList());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth ->
                        auth
                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                .requestMatchers("/api/auth/**",
                                        "/i18n/**",
                                        "/content/**",
                                        "/v3/api-docs/swagger-config/**",
                                        "/v3/api-docs/**",
                                        "/v2/api-docs/**",
                                        "/",
                                        "/swagger-ui/**",
                                        "/apidoc/**",
                                        "/swagger-resources/**",
                                        "/actuator/**",
                                        "/api/v1/**",
                                        "/api/licences/**",
                                        "/api/parameters/**",
                                        "/api/customer/auth/**",
                                        "/swagger-ui.html").permitAll()
                                .requestMatchers("/api/test/**").permitAll()
                                .anyRequest().authenticated()
                );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}