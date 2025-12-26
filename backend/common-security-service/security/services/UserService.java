package com.optimize.common.securities.security.services;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.entities.util.CustomValidator;
import com.optimize.common.securities.config.ProfileProperties;
import com.optimize.common.securities.dto.ChangePasswordDto;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.util.DefaultResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class UserService extends GenericService<User, Long> {

    private final UserProfilService userProfilService;
    private final PasswordEncoder passwordEncoder;
    private final ProfileProperties profileProperties;
    private final UserAccountService userAccountService;

    protected UserService(UserRepository repository,
                          UserProfilService userProfilService,
                          PasswordEncoder passwordEncoder,
                          ProfileProperties profileProperties,
                          UserAccountService userAccountService) {
        super(repository);
        this.userProfilService = userProfilService;
        this.passwordEncoder = passwordEncoder;
        this.profileProperties = profileProperties;
        this.userAccountService = userAccountService;
    }

    @Transactional
    public Map<String, Object> updateUser(User user) {
        final User old = getById(user.getId());
        user.setUserAccount(old.getUserAccount());
        repository.saveAndFlush(user);
        return DefaultResponse.successReturn();
    }

    public Map<String, Object> changePassword(ChangePasswordDto changePasswordDto) {
        User old = getById(changePasswordDto.getId());
        //todo: Valider l'ancien mot de passe
        UserAccount userAccount = old.getUserAccount();
        userAccount.setPassword(passwordEncoder.encode(changePasswordDto.getNewPassword()));
        old.setUserAccount(userAccount);
        repository.saveAndFlush(old);
        return DefaultResponse.successReturn();
    }

    public User getByEmail(String email) {
        return getRepository().findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("user.not.found"));
    }

    public boolean existsByEmail(String email) {
        return getRepository().existsByEmail(email);
    }

    public List<User> getByUserProfil(String name) {
        return getRepository().findByUserAccount_userProfil_name(name);
    }

    public User getCurrentUser() {
        SecurityContext securityContext = SecurityContextHolder.getContext();
        User user = null;
        Optional<String> username = Optional.ofNullable(securityContext.getAuthentication())
                .map(this::getAuthenticationUsername);
        if (username.isPresent() && !"anonymousUser".equals(username.get())) {
            user = ((UserRepository) repository).findByUserAccount_username(username.get())
                    .orElseThrow(ResourceNotFoundException::new);
        }
        return user;
    }

    public String getAuthenticationUsername(Authentication authentication) {
        if (authentication.getPrincipal() instanceof UserDetails springSecurityUser) {
            return springSecurityUser.getUsername();
        } else if (authentication.getPrincipal() instanceof String) {
            return (String) authentication.getPrincipal();
        }
        return null;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public void initUsers() {
        if (profileProperties.getAutoInitialize().isEnabled()) {
            Map<String, Object> accounts = profileProperties.getUsers().getAccounts();
            Set<String> accountKeys = accounts.keySet();
            accountKeys.forEach(accountKey -> {
                Map<String, Object> account  = (Map<String, Object>) accounts.get(accountKey);

                UserAccount userAccount = new UserAccount();
                userAccount.setUsername((String) account.get("username"));
                if (!userAccountService.existsByUsername(userAccount.getUsername())) {
                    userAccount.setPassword((String) account.get("password"));
                    UserProfil userProfil = userProfilService.getByName((String) account.get("profil"));
                    userAccount.setUserProfil(userProfil);
                    userAccount.setCreatedBy("System");
                    userAccount.setState(State.ENABLED);
                    userAccount.setActive(Boolean.TRUE);
                    userAccountService.create(userAccount);

                    Map<String, Object> userDetails = (Map<String, Object>) account.get("user-details");
                    User user = new User((String) userDetails.get("firstname"),
                            (String) userDetails.get("lastname"),
                            (String) userDetails.get("gender"),
                            (String) userDetails.get("email"),
                            String.valueOf(userDetails.get("phone")) ,
                            userAccount);
                    CustomValidator.validateEmail(user.getEmail());
                    CustomValidator.validatePhoneNumber(user.getPhone());
                    user.setCreatedBy("System");
                    user.setState(State.ENABLED);
                    create(user);
                }
            });
        }
    }

    public UserRepository getRepository() {
        return (UserRepository) super.getRepository();
    }
}
