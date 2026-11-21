package com.optimize.common.securities.security.services;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.repository.AccountPermissionRepository;
import com.optimize.common.securities.repository.UserAccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserAccountService extends GenericService<UserAccount, Long> {

    private final PasswordEncoder passwordEncoder;
    private final AccountPermissionRepository accountPermissionRepository;
    private final UserProfilService userProfilService;

    protected UserAccountService(UserAccountRepository repository,
                                 PasswordEncoder passwordEncoder,
                                 AccountPermissionRepository accountPermissionRepository,
                                 UserProfilService userProfilService) {
        super(repository);
        this.passwordEncoder = passwordEncoder;
        this.accountPermissionRepository = accountPermissionRepository;
        this.userProfilService = userProfilService;
    }

    @Override
    @Transactional
    public UserAccount create(UserAccount userAccount) {
        String password = userAccount.getPassword();
        userAccount.setPassword(passwordEncoder.encode(password));
        userAccount.setUserProfil(userProfilService.getById(userAccount.getUserProfilId()));
        userAccount = super.create(userAccount);
        accountPermissionRepository.saveAll(userAccount.getPermissions());
        return userAccount;
    }

    public UserAccount getByUsername(String username) {
        return getRepository().findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("account.not.found"));
    }

    public boolean existsByUsername(String username) {
        return getRepository().existsByUsername(username);
    }


    public UserAccountRepository getRepository() {
        return (UserAccountRepository) super.getRepository();
    }
}
