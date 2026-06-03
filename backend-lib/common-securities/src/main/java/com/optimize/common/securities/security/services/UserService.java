package com.optimize.common.securities.security.services;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.entities.util.CustomValidator;
import com.optimize.common.securities.config.ProfileProperties;
import com.optimize.common.securities.dto.ChangePasswordDto;
import com.optimize.common.securities.models.AccountPermission;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.util.DefaultResponse;
import com.optimize.common.securities.util.ProfilConstant;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final UserPermissionService userPermissionService;

    protected UserService(UserRepository repository,
                          UserProfilService userProfilService,
                          PasswordEncoder passwordEncoder,
                          ProfileProperties profileProperties,
                          UserAccountService userAccountService,
                          UserPermissionService userPermissionService) {
        super(repository);
        this.userProfilService = userProfilService;
        this.passwordEncoder = passwordEncoder;
        this.profileProperties = profileProperties;
        this.userAccountService = userAccountService;
        this.userPermissionService = userPermissionService;
    }

    @Transactional
    public void assignProfile(Long userId, Long profilId) {
        User user = getById(userId);
        UserProfil profil = userProfilService.getById(profilId);
        
        // Update profile in UserAccount
        UserAccount userAccount = user.getUserAccount();
        userAccount.setUserProfil(profil);
        
        // Remove existing permissions
        userAccount.getPermissions().clear();
        
        // Add permissions from the new profile
        profil.getProfilPermissions().forEach(pp -> {
            userAccount.getPermissions().add(new AccountPermission(userAccount, pp.getUserPermission()));
        });
        
        userAccountService.update(userAccount);
    }

    @Transactional
    public void addPermission(Long userId, String permissionName) {
        User user = getById(userId);
        UserPermission permission = userPermissionService.getByName(permissionName);
        UserAccount userAccount = user.getUserAccount();
        
        boolean exists = userAccount.getPermissions().stream()
                .anyMatch(ap -> ap.getUserPermission().equals(permission));
        
        if (!exists) {
            userAccount.getPermissions().add(new AccountPermission(userAccount, permission));
            userAccountService.update(userAccount);
        }
    }

    @Transactional
    public void removePermission(Long userId, String permissionName) {
        User user = getById(userId);
        UserPermission permission = userPermissionService.getByName(permissionName);
        UserAccount userAccount = user.getUserAccount();
        
        userAccount.getPermissions().removeIf(ap -> ap.getUserPermission().equals(permission));
        userAccountService.update(userAccount);
    }

    @Transactional
    public Map<String, Object> updateUser(User user) {
        final User old = getById(user.getId());
        user.setUserAccount(old.getUserAccount());
        repository.saveAndFlush(user);
        return DefaultResponse.successReturn();
    }

    @Transactional
    public Map<String, Object> changePassword(ChangePasswordDto changePasswordDto) {
        User old = getById(changePasswordDto.getId());
        User currentUser = getCurrentUser();
        if (!currentUser.getUserAccount().getUsername().equals(old.getUserAccount().getUsername()) && (!currentUser.is("MANAGER") || !currentUser.is("ADMIN") || !currentUser.is("SUPER_ADMIN"))) {
            throw new CustomValidationException("Vous n'êtes pas autorisé à changer le mot de passe de l'utilisateur");
        }
        UserAccount userAccount = old.getUserAccount();
        if (!passwordEncoder.matches(changePasswordDto.getOldPassword(), userAccount.getPassword())) {
            throw new CustomValidationException("L'ancien mot de passe est incorrect.");
        }
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
        return getRepository().findByUserAccount_userProfil_nameAndUserAccount_activeIsTrueOrderByUserAccount_username(name);
    }

    public Page<User> getAll(Pageable pageable, String searchTerm) {
        String effectiveSearch = (searchTerm != null && !searchTerm.trim().isEmpty()) ? searchTerm.trim() : null;
        if (effectiveSearch == null) {
            return getRepository().findByStateNot(State.DELETED, pageable);
        }
        return getRepository().search(effectiveSearch, pageable);
    }

    @Transactional
    public User setActive(Long id, boolean active) {
        User user = getById(id);
        UserAccount userAccount = user.getUserAccount();
        State state = active ? State.ENABLED : State.DISABLED;
        user.setState(state);
        userAccount.setState(state);
        userAccount.setActive(active);
        userAccountService.update(userAccount);
        return repository.saveAndFlush(user);
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
