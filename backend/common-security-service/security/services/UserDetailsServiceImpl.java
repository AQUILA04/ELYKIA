package com.optimize.common.securities.security.services;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.payload.request.SignupRequest;
import com.optimize.common.securities.payload.response.MessageResponse;
import com.optimize.common.securities.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.optimize.common.securities.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

  private final UserRepository userRepository;
  private final PasswordEncoder encoder;
  private final UserProfilService userProfilService;
  private final UserAccountService userAccountService;

  @Override
  @Transactional
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    User user = userRepository.findByUserAccount_username(username)
        .orElseThrow(() -> new UsernameNotFoundException("User Not Found with username: " + username));

    return UserDetailsImpl.build(user);
  }

  public User registerUser(SignupRequest signUpRequest) {
    if (userRepository.existsByUserAccount_username(signUpRequest.getUsername())) {
      throw new CustomValidationException("Error: Username is already taken!");
    }

    if (userRepository.existsByEmail(signUpRequest.getEmail())) {
      throw new CustomValidationException("Error: Email is already in use!");
    }
    User user = new User(signUpRequest.getFirstname(), signUpRequest.getLastname(), signUpRequest.getGender(), signUpRequest.getEmail(),
            signUpRequest.getPhone(), signUpRequest.getUsername(), signUpRequest.getPassword());
    UserProfil profil = userProfilService.getById(signUpRequest.getProfilId());
    user.addProfile(profil);
    UserAccount createdAccount = userAccountService.create(user.getUserAccount());
    user.setUserAccount(createdAccount);
    return userRepository.save(user);
  }

}
