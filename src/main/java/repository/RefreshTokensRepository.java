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

    @Modifying
    @Query("DELETE FROM RefreshTokens rt WHERE rt.expiresAt < :now OR rt.isRevoked = true")
    int deleteRevokedTokens(@Param("now") LocalDateTime now);

    List<RefreshTokens> findByTokenFamily(String tokenFamily);

    Optional<RefreshTokens> findByPreviousToken(String previousToken);

    boolean existsByTokenFamily(String tokenFamily);

    @Modifying
    @Query("UPDATE RefreshTokens rt SET rt.isRevoked = true, rt.revokedDueToReuse = true, rt.revokedAt = :now WHERE rt.tokenFamily = :tokenFamily")
    void revokeTokenFamily(@Param("tokenFamily") String tokenFamily, @Param("now") LocalDateTime now);

    @Query("SELECT COUNT(rt) FROM RefreshTokens rt WHERE rt.tokenFamily = :tokenFamily AND rt.isRevoked = false AND rt.expiresAt > :now")
    long countActiveTokensInFamily(@Param("tokenFamily") String tokenFamily, @Param("now") LocalDateTime now);

    @Query("SELECT rt FROM RefreshTokens rt WHERE rt.rotationCount > :maxRotations AND rt.isRevoked = false")
    List<RefreshTokens> findTokensWithHighRotationCount(@Param("maxRotations") int maxRotations);

    @Query("SELECT rt FROM RefreshTokens rt WHERE rt.lastRotatedAt > :since AND rt.tokenFamily = :tokenFamily")
    List<RefreshTokens> findRecentlyRotatedTokensInFamily(@Param("tokenFamily") String tokenFamily, @Param("since") LocalDateTime since);

    @Query("SELECT rt FROM RefreshTokens rt WHERE rt.revokedDueToReuse = true AND rt.revokedAt > :since")
    List<RefreshTokens> findTokensRevokedForReuse(@Param("since") LocalDateTime since);

    @Query("SELECT rt FROM RefreshTokens rt WHERE rt.tokenFamily = :tokenFamily ORDER BY rt.createdAt DESC LIMIT 1")
    Optional<RefreshTokens> findLatestTokenInFamily(@Param("tokenFamily") String tokenFamily);

    @Query("SELECT SUM(rt.rotationCount) FROM RefreshTokens rt WHERE rt.userId = :userId")
    Long getTotalRotationCountForUser(@Param("userId") UUID userId);
}
