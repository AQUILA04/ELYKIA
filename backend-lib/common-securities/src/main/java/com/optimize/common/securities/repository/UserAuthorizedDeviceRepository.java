package com.optimize.common.securities.repository;

import com.optimize.common.securities.models.UserAuthorizedDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAuthorizedDeviceRepository extends JpaRepository<UserAuthorizedDevice, Long> {

    List<UserAuthorizedDevice> findByUserIdOrderByLastSeenAtDesc(Long userId);

    List<UserAuthorizedDevice> findByUserIdAndActiveTrue(Long userId);

    Optional<UserAuthorizedDevice> findByUserIdAndDeviceId(Long userId, String deviceId);

    Optional<UserAuthorizedDevice> findByIdAndUserId(Long id, Long userId);
}
