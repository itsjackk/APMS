package repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tables.Users;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<Users, UUID> {
    Optional<Users> findByUsername(String username);

    Optional<Users> findByEmail(String email);

    Optional<Users> findById(UUID uuid);

    Optional<Users> findByUsernameGHUB(String usernameGHUB);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    List<Users> findAll();

    List<Users> findByRole(Users.Role role);

    long countByRole(Users.Role role);

    List<Users> findByRoleAndEnabledTrue(Users.Role role, Boolean enabled);
}
