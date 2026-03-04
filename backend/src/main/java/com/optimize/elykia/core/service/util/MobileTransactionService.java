package com.optimize.elykia.core.service.util;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.MobileTransaction;
import com.optimize.elykia.core.repository.MobileTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MobileTransactionService extends GenericService<MobileTransaction, Long> {

    protected MobileTransactionService(MobileTransactionRepository repository) {
        super(repository);
    }

    public List<MobileTransaction> getAllTransactionByCommercial(String commercialId) {
        return getRepository().findByCommercialIdAndState(commercialId, State.ENABLED);
    }

    public MobileTransactionRepository getRepository() {
       return (MobileTransactionRepository)  super.getRepository();
    }
}
