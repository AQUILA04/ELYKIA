package com.optimize.common.securities.security.services;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.config.ProfileProperties;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.repository.UserPermissionRepository;
import com.optimize.common.securities.util.AuthorityConstant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
@Transactional(readOnly = true)
@Slf4j
public class UserPermissionService extends GenericService<UserPermission, Long> {
    private final ProfileProperties profileProperties;
    protected UserPermissionService(UserPermissionRepository repository,
                                    ProfileProperties profileProperties) {
        super(repository);
        this.profileProperties = profileProperties;
    }

    @Transactional
    public void initPermissions() {
        if (profileProperties.getAutoInitialize().isEnabled()) {
            String[] permissions = profileProperties.getPermissions().split(",");
            addPermissions(permissions);

            String[] profils = profileProperties.getProfiles().split(",");
            for (String profil : profils) {
                log.info("Initializing permissions for profile: {}", profil.trim());
                permissions = profileProperties.getProfilPermissions().get(profil.trim()).split(",");
                addPermissions(permissions);
            }
        }
    }

    private void addPermissions(String[] permissions) {
        for (String permission : permissions) {
            if (!existsByName(permission.trim())) {
                repository.save(new UserPermission(permission.trim(), Boolean.TRUE));
            }
        }
    }

    @Transactional
    public void addDefaultPermissions(Set<UserPermission> permissions) {
        permissions.forEach(permission -> {
            if (!getRepository().existsByName(permission.getName())) {
                repository.save(permission);
            }
        });
    }

    public Set<UserPermission> adminPermissions () {
        return new HashSet<>(Set.of(new UserPermission(AuthorityConstant.ADMIN, Boolean.FALSE),
                new UserPermission(AuthorityConstant.WRITE_GLOBAL, Boolean.FALSE),
                new UserPermission(AuthorityConstant.HARD_DELETE, Boolean.FALSE),
                new UserPermission(AuthorityConstant.SOFT_DELETE, Boolean.FALSE),
                new UserPermission(AuthorityConstant.READ_GLOBAL, Boolean.FALSE))
        );

    }

    public Set<UserPermission> userPermissions () {
        return new HashSet<>(Set.of(new UserPermission(AuthorityConstant.USER, Boolean.FALSE),
                new UserPermission(AuthorityConstant.READ_GLOBAL, Boolean.FALSE))
        );
    }

    public UserPermission getByName (String name) {
        return getRepository().findByName(name).orElseThrow(() -> new ResourceNotFoundException("Permission with name " + name + " not found"));
    }

    public boolean existsByName (String name) {
        return getRepository().existsByName(name);
    }

    @Override
    public UserPermissionRepository getRepository() {
        return (UserPermissionRepository) repository;
    }
}
