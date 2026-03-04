package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.service.GenericService;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.entity.CreditPaymentEvent;
import com.optimize.elykia.core.repository.CreditPaymentEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Transactional
public class CreditPaymentEventService extends GenericService<CreditPaymentEvent, Long> {
    
    private final CreditPaymentEventRepository paymentEventRepository;

    public CreditPaymentEventService(CreditPaymentEventRepository repository,
                                     CreditPaymentEventRepository paymentEventRepository) {
        super(repository);
        this.paymentEventRepository = paymentEventRepository;
    }

    public CreditPaymentEvent recordPayment(Credit credit, Double amount, String paymentMethod) {
        CreditPaymentEvent event = new CreditPaymentEvent();
        event.setCredit(credit);
        event.setPaymentDate(LocalDateTime.now());
        event.setAmount(amount);
        event.setPaymentMethod(paymentMethod);
        
        // Calculer les jours depuis le dernier paiement
        List<CreditPaymentEvent> previousPayments = paymentEventRepository
            .findByCreditIdOrderByPaymentDateDesc(credit.getId());
            
        if (!previousPayments.isEmpty()) {
            CreditPaymentEvent lastPayment = previousPayments.get(0);
            long daysSinceLastPayment = ChronoUnit.DAYS.between(
                lastPayment.getPaymentDate().toLocalDate(), 
                LocalDateTime.now().toLocalDate()
            );
            event.setDaysFromLastPayment((int) daysSinceLastPayment);
            
            // Déterminer si le paiement est à temps (basé sur la mise journalière)
            Double expectedDays = credit.getDailyStake() > 0 ? amount / credit.getDailyStake() : 0;
            event.setIsOnTime(daysSinceLastPayment <= expectedDays + 2); // Tolérance de 2 jours
        } else {
            event.setDaysFromLastPayment(0);
            event.setIsOnTime(true); // Premier paiement
        }
        
        return paymentEventRepository.save(event);
    }
    
    public Double calculatePaymentRegularityScore(Long creditId) {
        List<CreditPaymentEvent> events = paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(creditId);
        
        if (events.isEmpty()) {
            return 0.0;
        }
        
        long onTimeCount = events.stream().filter(CreditPaymentEvent::getIsOnTime).count();
        return (double) onTimeCount / events.size() * 100;
    }
    
    public List<CreditPaymentEvent> getPaymentHistory(Long creditId) {
        return paymentEventRepository.findByCreditIdOrderByPaymentDateDesc(creditId);
    }
}
