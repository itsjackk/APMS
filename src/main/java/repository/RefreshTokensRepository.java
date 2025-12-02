package repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tables.RefreshTokens;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokensRepository extends JpaRepository<RefreshTokens, UUID> {
    Optional<RefreshTokens> findByToken(String token);
    List<RefreshTokens> findByUserIdAndIsRevokedFalse(UUID userId);
    
    @Modifying
    @Query("UPDATE RefreshTokens rt SET rt.isRevoked = true WHERE rt.userId = :userId")
    void revokeAllUserTokens(@Param("userId") UUID userId);
    
    @Modifying
    @Query("UPDATE RefreshTokens rt SET rt.isRevoked = true WHERE rt.expiresAt < :now AND rt.isRevoked = false")
    int revokeExpiredTokens(@Param("now") LocalDateTime now);
    
    @Modifying
    @Query("DELETE FROM RefreshTokens rt WHERE rt.expiresAt < :now OR rt.isRevoked = true")
    int deleteExpiredAndRevokedTokens(@Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM RefreshTokens rt WHERE rt.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}
