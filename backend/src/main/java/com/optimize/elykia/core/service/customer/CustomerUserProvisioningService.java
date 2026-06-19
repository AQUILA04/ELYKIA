package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAccount;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.services.UserAccountService;
import com.optimize.common.securities.security.services.UserProfilService;
import com.optimize.common.securities.util.ProfilConstant;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.event.ClientCreatedEvent;
import com.optimize.elykia.client.event.ClientPhoneUpdatedEvent;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.entity.customer.CustomerUserMapping;
import com.optimize.elykia.core.repository.customer.CustomerUserMappingRepository;
import com.optimize.elykia.core.util.CustomerEmailGenerator;
import com.optimize.elykia.core.util.PhoneNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerUserProvisioningService {

    private final ClientRepository clientRepository;
    private final CustomerUserMappingRepository mappingRepository;
    private final UserRepository userRepository;
    private final UserAccountService userAccountService;
    private final UserProfilService userProfilService;
    private final CustomerEmailGenerator emailGenerator;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void provisionExistingClients() {
        List<Client> clients = clientRepository.findByClientTypeAndState(ClientType.CLIENT, State.ENABLED);
        int created = 0;
        for (Client client : clients) {
            if (provisionIfAbsent(client)) {
                created++;
            }
        }
        if (created > 0) {
            log.info("Espace client : {} comptes utilisateurs créés (batch initial)", created);
        }
    }

    @EventListener
    @Transactional
    public void onClientCreated(ClientCreatedEvent event) {
        if (event.getClientId() == null) {
            return;
        }
        clientRepository.findById(event.getClientId()).ifPresent(this::provisionIfAbsent);
    }

    @Transactional
    public boolean provisionIfAbsent(Client client) {
        if (!ClientType.CLIENT.equals(client.getClientType()) || !State.ENABLED.equals(client.getState())) {
            return false;
        }
        if (mappingRepository.existsByClientId(client.getId())) {
            return false;
        }
        String username = PhoneNormalizer.toUsername(client.getPhone());
        if (!StringUtils.hasText(username)) {
            log.warn("Client {} sans téléphone valide — compte non créé", client.getId());
            return false;
        }
        if (mappingRepository.existsByUsername(username) || userAccountService.existsByUsername(username)) {
            log.warn("Téléphone {} déjà utilisé — compte non créé pour client {}", username, client.getId());
            return false;
        }
        createUserForClient(client, username);
        return true;
    }

    @EventListener
    @Transactional
    public void onClientPhoneUpdated(ClientPhoneUpdatedEvent event) {
        if (mappingRepository.existsByClientId(event.getClientId())) {
            syncPhoneChange(event.getClientId(), event.getOldPhone(), event.getNewPhone());
        }
    }

    @Transactional
    public void syncPhoneChange(Long clientId, String oldPhone, String newPhone) {
        String newUsername = PhoneNormalizer.toUsername(newPhone);
        String oldUsername = PhoneNormalizer.toUsername(oldPhone);
        if (!StringUtils.hasText(newUsername)) {
            throw new CustomValidationException("Numéro de téléphone invalide.");
        }
        if (mappingRepository.existsByUsername(newUsername) && !newUsername.equals(oldUsername)) {
            throw new CustomValidationException("Ce numéro de téléphone est déjà utilisé.");
        }
        CustomerUserMapping mapping = mappingRepository.findByClientId(clientId)
                .orElseThrow(() -> new CustomValidationException("Mapping utilisateur client introuvable."));
        User user = userRepository.findByUserAccount_username(oldUsername)
                .orElseThrow(() -> new CustomValidationException("Compte utilisateur introuvable."));
        mapping.setUsername(newUsername);
        user.getUserAccount().setUsername(newUsername);
        user.setPhone(newUsername);
        mappingRepository.save(mapping);
        userRepository.save(user);
    }

    private void createUserForClient(Client client, String username) {
        UserProfil profil = userProfilService.getByName(ProfilConstant.CLIENT_PROFIL);
        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPassword(UUID.randomUUID().toString());
        account.setUserProfil(profil);
        account.setActive(Boolean.TRUE);
        account.setPinConfigured(Boolean.FALSE);
        account.setState(State.ENABLED);
        account.setCreatedBy("System");
        account = userAccountService.create(account);

        User user = new User(
                client.getFirstname(),
                client.getLastname(),
                "N/A",
                emailGenerator.generate(client.getFirstname(), client.getLastname()),
                username,
                account);
        user.setState(State.ENABLED);
        user.setCreatedBy("System");
        userRepository.save(user);

        CustomerUserMapping mapping = new CustomerUserMapping();
        mapping.setClientId(client.getId());
        mapping.setUsername(username);
        mapping.setCreatedBy("System");
        mapping.setState(State.ENABLED);
        mappingRepository.save(mapping);
        log.info("Compte espace client créé pour client {} (username={})", client.getId(), username);
    }
}
