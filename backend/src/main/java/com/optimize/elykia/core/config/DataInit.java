package com.optimize.elykia.core.config;

import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.service.UserManagement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInit implements ApplicationListener<ApplicationReadyEvent> {
    private final UserManagement userManagement;
    private final ClientService clientService;

    @Override
    public void onApplicationEvent(@NonNull ApplicationReadyEvent event) {
        userManagement.initialize();
        clientService.initClient();
        log.info("APPLICATION INITIALIZED SUCCESSFUL !!!");
    }
}
