package com.optimize.elykia.core.service.util;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.Recovery;
import com.optimize.elykia.core.repository.RecoveryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
