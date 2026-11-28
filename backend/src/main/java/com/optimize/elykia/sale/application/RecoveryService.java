package com.optimize.elykia.sale.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.sale.domain.Recovery;
import com.optimize.elykia.sale.infrastructure.persistence.RecoveryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * @deprecated Silo historique non raccordé au moteur de recouvrement unifié
 *             ({@link com.optimize.elykia.sale.api.CreditRecoveryUseCase}).
 */
@Deprecated(since = "2.17.0", forRemoval = true)
@Service
@Transactional(readOnly = true)
public class RecoveryService extends GenericService<Recovery, Long> {

    protected RecoveryService(RecoveryRepository repository) {
        super(repository);
    }

    public List<Recovery> getAllRecoveriesByCommercial(String commercial) {
        return getRepository().findByCommercialIdAndState(commercial, State.ENABLED);
    }

    public RecoveryRepository getRepository() {
        return (RecoveryRepository) super.getRepository();
    }
}
