package com.optimize.common.securities.config;

import com.optimize.common.securities.security.services.UserPermissionService;
import com.optimize.common.securities.security.services.UserProfilService;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.DeploymentLicenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class Initializer implements ApplicationListener<ApplicationReadyEvent> {
    private final UserProfilService userProfilService;
    private final UserPermissionService userPermissionService;
    private final UserService userService;
    private final DeploymentLicenceService deploymentLicenceService;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        userProfilService.initProfil();
        userPermissionService.initPermissions();
        userProfilService.initProfilesPermissions();
        userService.initUsers();
        deploymentLicenceService.initDeploy();

        log.info("*** APPLICATION INITIALIZE SUCCESSFUL {} ***", event.getTimeTaken());
    }
}
