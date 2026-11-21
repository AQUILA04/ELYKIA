package com.optimize.common.securities.security.services;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.config.ProfileProperties;
import com.optimize.common.securities.models.ProfilPermission;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.repository.ProfilPermissionRepository;
import com.optimize.common.securities.repository.UserProfilRepository;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class UserProfilService extends GenericService<UserProfil, Long> {
    private final UserPermissionService userPermissionService;
    private final ProfilPermissionRepository profilPermissionRepository;
    private final ProfileProperties profileProperties;

    protected UserProfilService(UserProfilRepository repository,
                                UserPermissionService userPermissionService,
                                ProfilPermissionRepository profilPermissionRepository,
                                ProfileProperties profileProperties) {
        super(repository);
        this.userPermissionService = userPermissionService;
        this.profilPermissionRepository = profilPermissionRepository;
        this.profileProperties = profileProperties;
    }

    @Override
    @Transactional
    public UserProfil create(UserProfil userProfil) {
        userProfil = super.create(userProfil);
        profilPermissionRepository.saveAll(userProfil.getProfilPermissions());
        return userProfil;
    }

    @Transactional
    public String addPermission(Set<String> permissions, Long profilId) {
        UserProfil profil = getById(profilId);
        Set<UserPermission> userPermissions = new HashSet<UserPermission>();
         permissions.forEach(permission -> {
            userPermissions.add(userPermissionService.getByName(permission));
        });
         profil.addPermissions(userPermissions);
         this.profilPermissionRepository.saveAll(profil.getProfilPermissions());

        return "success:true";
    }

    @Transactional
    public String removePermission(Long profilId, String permissionName) {
        UserProfil profil = getById(profilId);
        UserPermission permission = userPermissionService.getByName(permissionName);
        
        Optional<ProfilPermission> profilPermission = profil.getProfilPermissions().stream()
                .filter(pp -> pp.getUserPermission().equals(permission))
                .findFirst();

        if (profilPermission.isPresent()) {
            profilPermissionRepository.delete(profilPermission.get());
            profil.getProfilPermissions().remove(profilPermission.get());
        }
        
        return "success:true";
    }

    @Transactional
    public void initProfil() {
        if (profileProperties.getAutoInitialize().isEnabled()) {
            String[] profiles = profileProperties.getProfiles().split(",");
            for (String profile : profiles) {
                if (!existsByName(profile.trim())) {
                    getRepository().save(new UserProfil(profile.trim(), Boolean.TRUE));
                }
            }
        }
    }

    @Transactional
    public void initProfilesPermissions() {
        if (profileProperties.getAutoInitialize().isEnabled()) {
            Map<String, String> profilesPermissions = profileProperties.getProfilPermissions();
            Set<String> profiles = profilesPermissions.keySet();
            profiles.forEach(profile -> {
                String[] profilPermissions = profilesPermissions.get(profile).split(",");
                UserProfil profil = getByName(profile.trim());
                Set<String> permissionsSet = new HashSet<>(Arrays.asList(profilPermissions));
                permissionsSet.forEach(permission -> {
                    if(!profilPermissionRepository.existsByUserProfil_nameAndUserPermission_name(profile, permission.trim())) {

                        UserPermission userPermission = userPermissionService.getByName(permission.trim());
                        ProfilPermission profilPermission = new ProfilPermission();
                        profilPermission.setUserProfil(profil);
                        profilPermission.setUserPermission(userPermission);
                        profilPermissionRepository.save(profilPermission);
                    }
                });
            });
        }
    }

    public boolean existsByName(String name) {
        return getRepository().existsByName(name.trim());
    }

    public UserProfil getByName(@NotNull String name) {
        return getRepository().findByName(name.trim())
                .orElseThrow(() -> new ResourceNotFoundException("UserProfil with name " + name + " not found"));
    }

    @Override
    public UserProfilRepository getRepository() {
        return (UserProfilRepository) repository;
    }

}
