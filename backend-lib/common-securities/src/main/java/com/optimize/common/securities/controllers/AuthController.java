package com.optimize.common.securities.controllers;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import com.optimize.common.securities.exception.InvalidLicenceException;
import com.optimize.common.securities.exception.LicenceExpiredException;
import com.optimize.common.securities.models.DeploymentLicence;
import com.optimize.common.securities.models.RefreshToken;
import com.optimize.common.securities.payload.request.LoginRequest;
import com.optimize.common.securities.payload.request.SignupRequest;
import com.optimize.common.securities.payload.request.TokenRefreshRequest;
import com.optimize.common.securities.payload.response.JwtResponse;
import com.optimize.common.securities.payload.response.MessageResponse;
import com.optimize.common.securities.payload.response.TokenRefreshResponse;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.jwt.JwtUtils;
import com.optimize.common.securities.security.jwt.exception.TokenRefreshException;
import com.optimize.common.securities.security.services.RefreshTokenService;
import com.optimize.common.securities.security.services.UserDetailsImpl;
import com.optimize.common.securities.security.services.UserDetailsServiceImpl;
import com.optimize.common.securities.service.DeploymentLicenceService;
import com.optimize.common.securities.service.LicenceService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
@SecurityRequirement(name = "bearerAuth")
public class AuthController {
  private AuthenticationManager authenticationManager;

  private JwtUtils jwtUtils;

  private RefreshTokenService refreshTokenService;
  private UserDetailsServiceImpl userDetailsService;
  private DeploymentLicenceService deploymentLicenceService;
  private LicenceService licenceService;

  @PostMapping("/signin")
  public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

    Authentication authentication = authenticationManager
        .authenticate(new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

    DeploymentLicence deploymentLicence = deploymentLicenceService.getLicence();
    if (Objects.isNull(deploymentLicence) || !licenceService.isValidLicence(deploymentLicence.getActivationCode())) {
        throw new LicenceExpiredException("Aucune licence valide trouvée !");
    }

    if (LocalDate.now().isBefore(deploymentLicence.getIssuedDate())) {
        throw new InvalidLicenceException("La date du système est invalide");
    }

    SecurityContextHolder.getContext().setAuthentication(authentication);
    String jwt = jwtUtils.generateJwtToken(authentication);

    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
    List<String> roles = userDetails.getAuthorities().stream().map(GrantedAuthority::getAuthority)
        .collect(Collectors.toList());
    RefreshToken refreshToken = refreshTokenService.createRefreshToken(userDetails.getId());

    return ResponseEntity.ok(new JwtResponse(jwt, refreshToken.getToken(), userDetails.getId(),
            userDetails.getUsername(), userDetails.getEmail(), roles, userDetails.getProfil()));
  }

  @PostMapping("/signup")
  public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
    userDetailsService.registerUser(signUpRequest);
    return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
  }

  @PostMapping("/refreshtoken")
  public ResponseEntity<?> refreshtoken(@Valid @RequestBody TokenRefreshRequest request) {
    String requestRefreshToken = request.getRefreshToken();

    return refreshTokenService.findByToken(requestRefreshToken)
            .map(refreshTokenService::verifyExpiration)
            .map(RefreshToken::getUser)
            .map(user -> {
              String token = jwtUtils.generateTokenFromUsername(user.getUsername());
              return ResponseEntity.ok(new TokenRefreshResponse(token, requestRefreshToken));
            })
            .orElseThrow(() -> new TokenRefreshException(requestRefreshToken,
                    "Refresh token is not in database!"));
  }


  @Autowired
  public void setAuthenticationManager(AuthenticationManager authenticationManager) {
    this.authenticationManager = authenticationManager;
  }

  @Autowired
  public void setJwtUtils(JwtUtils jwtUtils) {
    this.jwtUtils = jwtUtils;
  }

  @Autowired
  public void setRefreshTokenService(RefreshTokenService refreshTokenService) {
    this.refreshTokenService = refreshTokenService;
  }

  @Autowired
  public void setUserDetailsService(UserDetailsServiceImpl userDetailsService) {
    this.userDetailsService = userDetailsService;
  }

  @Autowired
    public void setDeploymentLicenceService(DeploymentLicenceService deploymentLicenceService) {
        this.deploymentLicenceService = deploymentLicenceService;
    }

    @Autowired
    public void setLicenceService(LicenceService licenceService) {
        this.licenceService = licenceService;
    }
}

