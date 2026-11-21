package com.optimize.elykia.tontine.application;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.tontine.domain.ClientAccountMovement;
import com.optimize.elykia.tontine.domain.TontineDelivery;
import com.optimize.elykia.tontine.infrastructure.persistence.ClientAccountMovementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@Transactional
public class ClientAccountService extends GenericService<ClientAccountMovement, Long> {

    public ClientAccountService(ClientAccountMovementRepository repository) {
        super(repository);
    }

    public void recordMovement(Client client, Double amount, String movementType, TontineDelivery tontineDelivery) {
        ClientAccountMovement movement = new ClientAccountMovement();
        movement.setClient(client);
        movement.setAmount(amount);
        movement.setMovementType(movementType);
        movement.setCreationDate(LocalDate.now());
        movement.setTontineDelivery(tontineDelivery);
        create(movement);
    }

    @Override
    public ClientAccountMovementRepository getRepository() {
        return (ClientAccountMovementRepository) repository;
    }
}
