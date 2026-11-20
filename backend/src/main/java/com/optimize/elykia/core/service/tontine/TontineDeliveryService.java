package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.service.AccountService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CreateDeliveryDto;
import com.optimize.elykia.core.dto.DeliveryItemDto;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.dto.TontineDeliveryItemDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOperation;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOutcome;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictReason;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.monitoring.BusinessMetricsPublisher;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.util.ClientAccountService;
import com.optimize.elykia.core.service.sale.CashSalePricingService;
import com.optimize.elykia.core.service.sale.CreditService;
import com.optimize.elykia.core.service.tontine.allocation.TontineProjectedBalanceCalculator;
import com.optimize.elykia.core.service.tontine.conflict.TontineDeliveryConflictService;
import com.optimize.elykia.core.service.tontine.conflict.TontineDeliveryDuplicateException;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class TontineDeliveryService {

    private final TontineDeliveryRepository deliveryRepository;
    private final TontineMemberRepository memberRepository;
    private final TontineSessionRepository sessionRepository;
    private final ArticlesRepository articlesRepository;
    private final UserService userService;
    private final CreditService creditService;
    private final ClientAccountService clientAccountService;
    private final AccountService accountService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final ClientService clientService;
    private final TontineDeliveryReferenceService deliveryReferenceService;
    private final TontineProjectedBalanceCalculator projectedBalanceCalculator;
    private final TontineDeliveryConflictService conflictService;

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Autowired(required = false)
    private CashSalePricingService cashSalePricingService;
    private BusinessMetricsPublisher metricsPublisher;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
    }

    @Transactional
    public TontineDeliveryDto createDelivery(CreateDeliveryDto dto) {
        log.info("Creating delivery for tontine member ID: {}", dto.getTontineMemberId());

        TontineMember member = memberRepository.findById(dto.getTontineMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Membre de tontine non trouvé"));

        requireSessionStatus(member,
                "La commande tontine n'est possible que tant que la session est ouverte ou clôturée.",
                TontineSessionStatus.ACTIVE, TontineSessionStatus.CLOSED);

        Optional<TontineDelivery> existing = deliveryRepository.findByTontineMemberId(member.getId());
        if (existing.isPresent()) {
            return handleSecondOrder(member, existing.get(), dto);
        }
        return persistNewDelivery(member, dto);
    }

    public TontineDeliveryDto distributeTontineDelivery(CreateDeliveryDto dto) {
        TontineMember member = memberRepository.findById(dto.getTontineMemberId())
                .orElseThrow(() -> new ResourceNotFoundException("Membre de tontine non trouvé"));

        requireSessionStatus(member, TontineSessionStatus.CLOSED,
                "La livraison directe n'est possible qu'une fois la session clôturée.");

        Optional<TontineDelivery> existing = deliveryRepository.findByTontineMemberId(member.getId());
        if (existing.isPresent()) {
            TontineDelivery current = existing.get();
            if (isReplayOf(current, dto.getReference()) && isDelivered(member)) {
                // La synchronisation renvoie une livraison déjà enregistrée : rien à refaire.
                return mapToDto(current);
            }
            TontineDeliveryConflictReason reason = isDelivered(member)
                    ? TontineDeliveryConflictReason.ALREADY_DELIVERED
                    : TontineDeliveryConflictReason.ORDER_ALREADY_PENDING;
            throw rejectSecondRecord(member, current,
                    incomingOf(member, TontineDeliveryConflictOperation.DIRECT_DELIVERY, dto), reason);
        }

        TontineDeliveryDto resp = persistNewDelivery(member, dto);
        this.validateDelivery(resp.getId());
        return this.deliverDelivery(resp.getId());
    }

    /**
     * Plusieurs téléphones peuvent utiliser le même compte commercial sans être synchronisés.
     * Une seconde commande pour le même membre s'ajoute à la première si le solde prévisionnel
     * couvre les deux ; sinon elle est refusée. Dans les deux cas, elle est inscrite au journal.
     */
    private TontineDeliveryDto handleSecondOrder(TontineMember member, TontineDelivery current, CreateDeliveryDto dto) {
        if (isReplayOf(current, dto.getReference())
                || conflictService.wasAlreadyMerged(member.getId(), dto.getReference())) {
            // Même saisie renvoyée par la synchronisation : elle est déjà enregistrée.
            TontineDeliveryDto replay = mapToDto(current);
            replay.setMergedIntoExisting(!isReplayOf(current, dto.getReference()));
            return replay;
        }

        TontineDeliveryConflictService.Incoming incoming =
                incomingOf(member, TontineDeliveryConflictOperation.ORDER, dto);
        if (isDelivered(member)) {
            throw rejectSecondRecord(member, current, incoming, TontineDeliveryConflictReason.ALREADY_DELIVERED);
        }

        List<TontineDeliveryItem> newItems = new ArrayList<>();
        double incomingTotal = buildItems(member, dto.getItems(), newItems);
        double currentTotal = current.getTotalAmount() != null ? current.getTotalAmount() : 0.0;
        double combined = currentTotal + incomingTotal;
        double projected = projectedBalanceCalculator.project(member);
        if (TontineProjectedBalanceCalculator.exceeds(combined, projected)) {
            throw rejectSecondRecord(member, current, incoming, TontineDeliveryConflictReason.BALANCE_EXCEEDED);
        }

        newItems.forEach(current::addItem);
        current.setTotalAmount(combined);
        current.setProjectedBalance(projected);
        current.setRemainingBalance(Math.max(0.0, availableOf(member) - combined));
        // Le contenu a changé : une commande validée repasse en attente, sauf saisie d'un gestionnaire.
        member.setDeliveryStatus(isManager(userService.getCurrentUser())
                ? TontineMemberDeliveryStatus.VALIDATED
                : TontineMemberDeliveryStatus.PENDING);
        memberRepository.save(member);
        TontineDelivery saved = deliveryRepository.save(current);

        conflictService.record(member, saved, incoming,
                TontineDeliveryConflictOutcome.MERGED, TontineDeliveryConflictReason.ORDER_MERGED);
        log.info("Second order {} merged into delivery {} for member {}.",
                dto.getReference(), saved.getId(), member.getId());
        TontineDeliveryDto result = mapToDto(saved);
        result.setMergedIntoExisting(true);
        return result;
    }

    /** Inscrit le refus au journal (transaction séparée) et renvoie l'exception 409 à lever. */
    private TontineDeliveryDuplicateException rejectSecondRecord(TontineMember member,
                                                                 TontineDelivery current,
                                                                 TontineDeliveryConflictService.Incoming incoming,
                                                                 TontineDeliveryConflictReason reason) {
        conflictService.record(member, current, incoming, TontineDeliveryConflictOutcome.REJECTED, reason);
        return new TontineDeliveryDuplicateException(reason, duplicateMessage(member, current, incoming, reason));
    }

    private String duplicateMessage(TontineMember member,
                                    TontineDelivery current,
                                    TontineDeliveryConflictService.Incoming incoming,
                                    TontineDeliveryConflictReason reason) {
        String reference = current.getReference() != null ? current.getReference() : "sans référence";
        String amount = formatAmount(current.getTotalAmount());
        return switch (reason) {
            case ALREADY_DELIVERED -> String.format(
                    "Ce membre a déjà été livré le %s (réf. %s, %s FCFA). Cette seconde saisie est refusée et signalée au gestionnaire.",
                    current.getDeliveryDate() != null ? current.getDeliveryDate().format(DATE_TIME) : "—",
                    reference, amount);
            case ORDER_ALREADY_PENDING -> String.format(
                    "Une commande est déjà enregistrée pour ce membre (réf. %s, %s FCFA). Livrez cette commande depuis la fiche du membre : la livraison directe est refusée et signalée au gestionnaire.",
                    reference, amount);
            case BALANCE_EXCEEDED -> String.format(
                    "Une commande de %s FCFA (réf. %s) est déjà enregistrée pour ce membre. Avec cette seconde commande (%s FCFA), le total dépasse le solde prévisionnel (%s FCFA) : elle est refusée et signalée au gestionnaire.",
                    amount, reference, formatAmount(incoming.amount()),
                    formatAmount(projectedBalanceCalculator.project(member)));
            case ORDER_MERGED -> "Commande ajoutée à la commande déjà enregistrée.";
        };
    }

    private TontineDeliveryConflictService.Incoming incomingOf(TontineMember member,
                                                               TontineDeliveryConflictOperation operation,
                                                               CreateDeliveryDto dto) {
        List<DeliveryItemDto> lines = dto.getItems() != null ? dto.getItems() : List.of();
        double amount;
        try {
            amount = buildItems(member, lines, new ArrayList<>());
        } catch (RuntimeException e) {
            // Article inconnu ou prix introuvable : le journal garde le montant envoyé par le téléphone.
            amount = lines.stream()
                    .mapToDouble(line -> (line.getQuantity() != null ? line.getQuantity() : 0)
                            * (line.getUnitPrice() != null ? line.getUnitPrice() : 0.0))
                    .sum();
        }
        String items = lines.stream()
                .map(line -> (line.getQuantity() != null ? line.getQuantity() : 0) + " × "
                        + articlesRepository.findById(line.getArticleId())
                                .map(Articles::getCommercialName)
                                .orElse("article " + line.getArticleId()))
                .collect(Collectors.joining("\n"));
        return new TontineDeliveryConflictService.Incoming(operation, dto.getReference(), amount, items,
                dto.getAuthenticityCode());
    }

    private TontineDeliveryConflictService.Incoming incomingOf(TontineDelivery delivery) {
        String items = delivery.getItems().stream()
                .map(item -> item.getQuantity() + " × " + item.getArticleName())
                .collect(Collectors.joining("\n"));
        return new TontineDeliveryConflictService.Incoming(TontineDeliveryConflictOperation.DELIVER,
                delivery.getReference(), delivery.getTotalAmount(), items);
    }

    private static boolean isReplayOf(TontineDelivery current, String incomingReference) {
        return StringUtils.hasText(incomingReference)
                && incomingReference.trim().equals(current.getReference());
    }

    private static boolean isDelivered(TontineMember member) {
        return member.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED;
    }

    private static boolean isManager(User user) {
        return user != null && (user.is("GESTIONNAIRE") || user.is("ADMIN"));
    }

    private static String formatAmount(Double value) {
        return String.format(java.util.Locale.FRANCE, "%,.0f", value != null ? value : 0.0);
    }

    private TontineDeliveryDto persistNewDelivery(TontineMember member, CreateDeliveryDto dto) {
        List<TontineDeliveryItem> items = new ArrayList<>();
        double totalAmount = buildItems(member, dto.getItems(), items);
        double projected = requireWithinProjectedBalance(member, totalAmount);
        double available = availableOf(member);

        LocalDateTime requestDate = dto.getRequestDate() != null ? dto.getRequestDate() : LocalDateTime.now();

        TontineDelivery delivery = new TontineDelivery();
        delivery.setTontineMember(member);
        // Placeholder until effective delivery (column is NOT NULL); overwritten on deliver/distribute.
        delivery.setDeliveryDate(requestDate);
        delivery.setTotalAmount(totalAmount);
        delivery.setRemainingBalance(Math.max(0.0, available - totalAmount));
        delivery.setProjectedBalance(projected);
        delivery.setAvailableAtOrder(available);
        delivery.setCommercialUsername(member.getClient().getCollector());
        delivery.setRequestDate(requestDate);
        delivery.setReference(deliveryReferenceService.resolveReference(dto.getReference(), requestDate));
        delivery.setAuthenticityCode(deliveryReferenceService.resolveAuthenticityCode(dto.getAuthenticityCode()));
        delivery.setOperationConsentCode(dto.getOperationConsentCode());
        delivery.setSyncConsentCode(dto.getSyncConsentCode());

        items.forEach(delivery::addItem);

        User currentUser = userService.getCurrentUser();
        if (isManager(currentUser)) {
            member.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
            TontineDelivery savedDelivery = deliveryRepository.save(delivery);
            if (metricsPublisher != null) {
                metricsPublisher.tontineDeliveryCreated(member.getClient().getCollector());
            }
            log.info("Delivery for member {} created and auto-validated.", member.getId());
            return mapToDto(savedDelivery);
        }

        member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        TontineDelivery savedDelivery = deliveryRepository.save(delivery);
        log.info("Delivery for member {} created with PENDING status (commande).", member.getId());
        return mapToDto(savedDelivery);
    }

    private void requireSessionStatus(TontineMember member, TontineSessionStatus expected, String message) {
        requireSessionStatus(member, message, expected);
    }

    private void requireSessionStatus(TontineMember member, String message, TontineSessionStatus... allowed) {
        TontineSession session = member.getTontineSession();
        if (session == null || !java.util.Arrays.asList(allowed).contains(session.getStatus())) {
            throw new CustomValidationException(message);
        }
    }

    @Transactional
    public TontineDeliveryDto validateDelivery(Long deliveryId) {
        TontineDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Livraison non trouvée"));
        TontineMember member = delivery.getTontineMember();

        // Valider une commande déjà livrée la ferait repasser en VALIDATED et rouvrirait la remise.
        if (isDelivered(member)) {
            throw new CustomValidationException("Cette commande est déjà livrée : elle ne peut plus être validée.");
        }

        member.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
        memberRepository.save(member);
        //
        log.info("Delivery {} validated.", delivery.getId());
        return mapToDto(delivery);
    }

    /**
     * Valide les livraisons demandées. Toutes doivent être en attente : sinon le lot est refusé.
     */
    public int validateSelected(List<Long> deliveryIds) {
        List<Long> distinctIds = distinctIds(deliveryIds);
        for (Long deliveryId : distinctIds) {
            TontineDelivery delivery = requireDelivery(deliveryId);
            if (delivery.getTontineMember().getDeliveryStatus() != TontineMemberDeliveryStatus.PENDING) {
                throw new CustomValidationException(
                        "Seules les livraisons en attente peuvent être validées ("
                                + displayReference(delivery) + ").");
            }
        }
        return markPendingValidated(distinctIds);
    }

    /**
     * Passe en validée les livraisons encore en attente. Les autres statuts sont ignorés.
     */
    public int validateStillPending(List<Long> deliveryIds) {
        return markPendingValidated(distinctIds(deliveryIds));
    }

    private int markPendingValidated(List<Long> deliveryIds) {
        int validated = 0;
        for (Long deliveryId : deliveryIds) {
            TontineDelivery delivery = requireDelivery(deliveryId);
            TontineMember member = delivery.getTontineMember();
            if (member.getDeliveryStatus() != TontineMemberDeliveryStatus.PENDING) {
                continue;
            }
            member.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
            memberRepository.save(member);
            validated++;
            log.info("Delivery {} validated.", delivery.getId());
        }
        return validated;
    }

    private TontineDelivery requireDelivery(Long deliveryId) {
        return deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Livraison non trouvée"));
    }

    private List<Long> distinctIds(List<Long> deliveryIds) {
        if (deliveryIds == null || deliveryIds.isEmpty()) {
            throw new CustomValidationException("Au moins une livraison est requise.");
        }
        return deliveryIds.stream().distinct().toList();
    }

    private String displayReference(TontineDelivery delivery) {
        return delivery.getReference() != null ? delivery.getReference() : "livraison " + delivery.getId();
    }

    public Page<TontineDeliveryDto> getValidatedDeliveries(Pageable pageable) {
        Page<TontineMember> membersPage = memberRepository.findByDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED,
                pageable);

        List<TontineDeliveryDto> content = membersPage.stream()
                .map(member -> {
                    if (member.getDelivery() != null) {
                        return mapToDto(member.getDelivery());
                    }
                    log.warn("Member {} has VALIDATED status but no associated delivery found.", member.getId());
                    return null;
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, membersPage.getTotalElements());
    }

    @Transactional
    public TontineDeliveryDto deliverDelivery(Long deliveryId) {
        TontineDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Livraison non trouvée"));
        TontineMember member = delivery.getTontineMember();

        // Deux téléphones peuvent remettre la même commande : la seconde remise ne doit ni recréer
        // le crédit tontine ni reverser le reliquat sur le compte client.
        if (isDelivered(member)) {
            throw rejectSecondRecord(member, delivery, incomingOf(delivery),
                    TontineDeliveryConflictReason.ALREADY_DELIVERED);
        }

        requireSessionStatus(member, TontineSessionStatus.CLOSED,
                "La remise n'est possible qu'une fois la session clôturée.");

        double available = availableOf(member);
        double total = delivery.getTotalAmount() != null ? delivery.getTotalAmount() : 0.0;
        if (TontineProjectedBalanceCalculator.exceeds(total, available)) {
            throw new CustomValidationException(String.format(
                    "Le solde réel (%.2f) ne couvre pas la commande (%.2f). Complétez le solde ou réduisez la commande.",
                    available, total));
        }
        delivery.setRemainingBalance(available - total);

        creditService.createTontineCredit(delivery);
        delivery.setDeliveryDate(LocalDateTime.now());
        deliveryRepository.save(delivery);
        member.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        memberRepository.save(member);

        // Add remaining balance to client account
        if (delivery.getRemainingBalance() > 0) {
            Account clientAccount = member.getClient().getAccount();
            if (clientAccount == null) {
                // Fetch account if not eager loaded or throw if client must always have an
                // account
                // clientAccount = accountService.findByClientId(member.getClient().getId())
                // .orElseThrow(() -> new CustomValidationException("Le client n'a pas de compte
                // pour y verser le solde."));
                throw new CustomValidationException(
                        "Le client n'a pas de compte pour y verser le solde. (AccountService not implemented or findByClientId missing)");
            }
            clientAccount.setAccountBalance(clientAccount.getAccountBalance() + delivery.getRemainingBalance());
            accountService.update(clientAccount); // Assuming update method exists and saves
            log.warn(
                    "AccountService.update(clientAccount) is commented out as AccountService.findByClientId is missing.");
            clientAccountService.recordMovement(member.getClient(), delivery.getRemainingBalance(),
                    "TONTINE_DELIVERY_DEPOSIT", delivery);
        }

        // Check if all members of the session are delivered
        TontineSession session = member.getTontineSession();
        // Reload session to ensure 'members' collection is initialized if LAZY fetched
        session = sessionRepository.findById(session.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tontine Session non trouvée pour le membre."));

        boolean allDelivered = session.getMembers().stream()
                .allMatch(m -> m.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED);

        if (allDelivered) {
            session.setStatus(TontineSessionStatus.ENDED);
            sessionRepository.save(session);
            log.info("Tontine session {} has been ENDED as all members are delivered.", session.getId());
        }

        if (eventPublisher != null) {
            // Publier l'événement de livraison tontine
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.TontineDeliveryEvent(
                    this,
                    delivery.getTotalAmount(),
                    delivery.getCommercialUsername(),
                    member.getClient().getFullName()));

        }

        clientService.updateTontineStatus(member.getClient().getId(), Boolean.FALSE);
        log.info("Delivery {} marked as DELIVERED.", delivery.getId());
        return mapToDto(delivery);
    }

    @Transactional
    public TontineDeliveryDto replaceItems(Long deliveryId, List<DeliveryItemDto> itemDtos) {
        TontineDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Livraison non trouvée"));
        TontineMember member = delivery.getTontineMember();
        if (member.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED) {
            throw new CustomValidationException("Une commande déjà livrée ne peut plus être modifiée.");
        }
        TontineSession session = member.getTontineSession();
        if (session == null || session.getStatus() == TontineSessionStatus.ENDED) {
            throw new CustomValidationException("La session est terminée. La commande ne peut plus être modifiée.");
        }
        if (itemDtos == null || itemDtos.isEmpty()) {
            throw new CustomValidationException("La commande doit contenir au moins un article.");
        }

        List<TontineDeliveryItem> items = new ArrayList<>();
        double totalAmount = buildItems(member, itemDtos, items);
        // Édition autorisée jusqu'au prévisionnel tant que non livré ; le solde réel est
        // vérifié uniquement à la remise (deliver / Compléter le solde).
        requireWithinProjectedBalance(member, totalAmount);

        new ArrayList<>(delivery.getItems()).forEach(delivery::removeItem);
        items.forEach(delivery::addItem);
        delivery.setTotalAmount(totalAmount);
        delivery.setRemainingBalance(Math.max(0.0, availableOf(member) - totalAmount));
        return mapToDto(deliveryRepository.save(delivery));
    }

    private double buildItems(TontineMember member, List<DeliveryItemDto> itemDtos, List<TontineDeliveryItem> items) {
        double totalAmount = 0;
        for (DeliveryItemDto itemDto : itemDtos) {
            Articles article = articlesRepository.findById(itemDto.getArticleId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Article non trouvé avec l'ID: " + itemDto.getArticleId()));

            TontineDeliveryItem item = new TontineDeliveryItem();
            item.setArticles(article);
            item.setArticleName(article.getCommercialName());
            item.setArticleId(article.getId());
            item.setArticleCode(article.getType() + "-" + article.getMarque());
            double itemTotal;
            String commercial = member.getClient() != null ? member.getClient().getCollector() : null;
            if (cashSalePricingService != null && commercial != null) {
                var quote = cashSalePricingService.quoteTontine(
                        article,
                        commercial,
                        itemDto.getSalePackMode(),
                        itemDto.getPackCount(),
                        itemDto.getUnitsPerPack(),
                        itemDto.getQuantity());
                quote.apply(item);
                itemTotal = quote.getLineAmount();
            } else {
                item.setQuantity(itemDto.getQuantity());
                item.setUnitPrice(itemDto.getUnitPrice());
                itemTotal = itemDto.getQuantity() * itemDto.getUnitPrice();
                item.setTotalPrice(itemTotal);
            }
            totalAmount += itemTotal;
            items.add(item);
        }
        return totalAmount;
    }

    private double requireWithinProjectedBalance(TontineMember member, double totalAmount) {
        double projected = projectedBalanceCalculator.project(member);
        if (TontineProjectedBalanceCalculator.exceeds(totalAmount, projected)) {
            if (metricsPublisher != null && member.getClient() != null) {
                metricsPublisher.tontineDeliveryAmountExceeded(member.getClient().getCollector());
            }
            throw new CustomValidationException(String.format(
                    "Le montant total (%.2f) dépasse le solde prévisionnel (%.2f)",
                    totalAmount, projected));
        }
        return projected;
    }

    private double availableOf(TontineMember member) {
        return member.getAvailableContribution() != null ? member.getAvailableContribution() : 0.0;
    }

    public TontineDeliveryDto getDeliveryByMemberId(Long tontineMemberId) {
        log.info("Fetching delivery for tontine member ID: {}", tontineMemberId);
        TontineDelivery delivery = deliveryRepository.findByTontineMemberId(tontineMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("Aucune livraison trouvée pour ce membre"));
        return mapToDto(delivery);
    }

    private TontineDeliveryDto mapToDto(TontineDelivery delivery) {
        if (delivery == null) {
            return null;
        }
        List<TontineDeliveryItemDto> itemDtos = delivery.getItems().stream()
                .map(item -> TontineDeliveryItemDto.builder()
                        .id(item.getId())
                        .articleId(item.getArticles().getId())
                        .articleName(item.getArticles().getCommercialName()) // Changed from
                                                                             // item.getArticles().getName() or
                                                                             // getCommercialName()
                        .articleCode(item.getArticles().getType() + "-" + item.getArticles().getMarque()) // Changed
                                                                                                          // from
                                                                                                          // item.getArticles().getReference()
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        TontineOrderBalance balance = TontineOrderBalance.of(delivery);
        return TontineDeliveryDto.builder()
                .netContribution(balance.netContribution())
                .amountDue(balance.amountDue())
                .refundableBalance(balance.refundableBalance())
                .id(delivery.getId())
                .tontineMemberId(delivery.getTontineMember().getId())
                .reference(delivery.getReference())
                .authenticityCode(delivery.getAuthenticityCode())
                .clientName(delivery.getTontineMember().getClient().getFullName())
                .requestDate(delivery.getRequestDate())
                .deliveryDate(delivery.getDeliveryDate())
                .totalAmount(delivery.getTotalAmount())
                .remainingBalance(delivery.getRemainingBalance())
                .projectedBalance(delivery.getProjectedBalance())
                .availableAtOrder(delivery.getAvailableAtOrder())
                .commercialUsername(delivery.getCommercialUsername())
                .deliveryStatus(delivery.getTontineMember().getDeliveryStatus())
                .items(itemDtos)
                .operationConsentCode(delivery.getOperationConsentCode())
                .syncConsentCode(delivery.getSyncConsentCode())
                .build();
    }
}
