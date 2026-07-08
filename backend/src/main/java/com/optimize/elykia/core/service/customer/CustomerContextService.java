package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.entity.customer.CustomerUserMapping;
import com.optimize.elykia.core.repository.customer.CustomerUserMappingRepository;
import com.optimize.elykia.core.util.PhoneNormalizer;
import com.optimize.common.entities.enums.State;
import com.optimize.common.securities.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerContextService {

    private final CustomerUserMappingRepository mappingRepository;
    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final UserRepository userRepository;

    public Optional<Long> findClientIdOptional(String username) {
        String localPhone = PhoneNormalizer.toUsername(username);
        if (!StringUtils.hasText(localPhone)) {
            return Optional.empty();
        }
        Optional<Long> fromMapping = mappingRepository.findByUsername(localPhone)
                .map(CustomerUserMapping::getClientId);
        if (fromMapping.isPresent()) {
            return fromMapping;
        }
        return findEnabledClientByPhone(localPhone).map(Client::getId);
    }

    public Long resolveClientId(String username) {
        return findClientIdOptional(username)
                .orElseThrow(() -> new ResourceNotFoundException("client.not.found"));
    }

    public Client requireClient(String username) {
        Long clientId = resolveClientId(username);
        Client client = clientService.getById(clientId);
        if (!ClientType.CLIENT.equals(client.getClientType())) {
            throw new CustomValidationException("Accès réservé aux clients finaux.");
        }
        return client;
    }

    public String currentUsername() {
        return userRepository.findByUserAccount_usernameIgnoreCase(
                        org.springframework.security.core.context.SecurityContextHolder.getContext()
                                .getAuthentication().getName())
                .map(u -> u.getUsername())
                .orElseThrow(ResourceNotFoundException::new);
    }

    private Optional<Client> findEnabledClientByPhone(String localPhone) {
        for (String candidate : phoneLookupCandidates(localPhone)) {
            Optional<Client> client = clientRepository.findFirstByPhoneAndClientTypeAndState(
                    candidate, ClientType.CLIENT, State.ENABLED);
            if (client.isPresent()) {
                return client;
            }
        }
        return Optional.empty();
    }

    private static List<String> phoneLookupCandidates(String localPhone) {
        return List.of(
                localPhone,
                PhoneNormalizer.toE164(localPhone),
                PhoneNormalizer.COUNTRY_CODE + localPhone,
                "0" + localPhone
        );
    }
}
