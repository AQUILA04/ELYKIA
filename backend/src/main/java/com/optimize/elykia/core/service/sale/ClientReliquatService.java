package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.entity.sale.ClientReliquat;
import com.optimize.elykia.core.repository.ClientReliquatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClientReliquatService {

    private final ClientReliquatRepository clientReliquatRepository;
    private final ClientRepository clientRepository;

    @Transactional
    public ClientReliquat addReliquat(Long clientId, Double amount, String mobileRecoveryId, LocalDate accountedDate) {
        ClientReliquat reliquat = clientReliquatRepository.findByClientId(clientId).orElse(null);
        if (reliquat == null) {
            Client client = clientRepository.findById(clientId)
                    .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
            reliquat = new ClientReliquat(client, 0.0);
        }
        reliquat.setTotalAmount(reliquat.getTotalAmount() + amount);
        reliquat.setLastRecoveryId(mobileRecoveryId);
        if (accountedDate != null) {
            reliquat.setLastAccountedDate(accountedDate);
        }
        return clientReliquatRepository.save(reliquat);
    }

    @Transactional
    public ClientReliquat consumeReliquat(Long clientId, Double amount, String mobileRecoveryId, LocalDate accountedDate) {
        ClientReliquat reliquat = clientReliquatRepository.findByClientId(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Reliquat not found for client"));
        if (reliquat.getTotalAmount() < amount) {
            log.warn("Tentative de consommer plus de reliquat ({}) que disponible ({}) pour le client {}", amount, reliquat.getTotalAmount(), clientId);
            amount = reliquat.getTotalAmount(); // On consomme tout ce qu'il reste
        }
        reliquat.setTotalAmount(reliquat.getTotalAmount() - amount);
        reliquat.setLastRecoveryId(mobileRecoveryId);
        if (accountedDate != null) {
            reliquat.setLastAccountedDate(accountedDate);
        }
        return clientReliquatRepository.save(reliquat);
    }

    @Transactional(readOnly = true)
    public Double getReliquatForClient(Long clientId) {
        return clientReliquatRepository.findByClientId(clientId)
                .map(ClientReliquat::getTotalAmount)
                .orElse(0.0);
    }

    @Transactional(readOnly = true)
    public List<ClientReliquat> findByCommercial(String commercialUsername) {
        // En supposant que Client a un champ 'collector' (commercial)
        // On pourrait utiliser une requête dans le repository pour optimiser.
        // Pour l'instant, on récupère tous et on filtre (à optimiser).
        return clientReliquatRepository.findAll().stream()
                .filter(r -> r.getClient().getCollector().equals(commercialUsername))
                .toList();
    }
}
