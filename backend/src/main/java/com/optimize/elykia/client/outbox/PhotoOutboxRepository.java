package com.optimize.elykia.client.outbox;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhotoOutboxRepository extends JpaRepository<PhotoOutboxEntry, Long> {

    List<PhotoOutboxEntry> findByStatusInAndRetryCountLessThan(List<OutboxStatus> statuses, int maxRetry);
}
