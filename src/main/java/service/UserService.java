package service;

import dto.UserResponse;
import dto.UserStats;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import repository.RefreshTokensRepository;
import repository.UserRepository;
import tables.Users;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static Logger log = LoggerFactory.getLogger(UserService.class);
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokensRepository refreshTokensRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID userId) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return UserResponse.fromEntity(user);
    }

    @Transactional
    public UserResponse updateUserRole(UUID userId, Users.Role role, Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can update user roles");
        }

        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setRole(role);
        Users updatedUser = userRepository.save(user);
        return UserResponse.fromEntity(updatedUser);
    }

    @Transactional
    public void deleteUser(UUID userId, Users admin) {
        if (!admin.isAdmin()) {
            throw new RuntimeException("Only admins can delete users");
        }

        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Delete all refresh tokens for this user
        refreshTokensRepository.deleteByUserId(userId);

        // Delete the user
        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public UserStats getUserStats() {
        List<Users> allUsers = userRepository.findAll();
        long totalUsers = allUsers.size();
        long adminUsers = allUsers.stream()
                .filter(Users::isAdmin)
                .count();
        long regularUsers = totalUsers - adminUsers;
        long enabledUsers = allUsers.stream()
                .filter(Users::isAccountEnabled)
                .count();
        long disabledUsers = totalUsers - enabledUsers;

        return new UserStats(totalUsers, adminUsers, regularUsers, enabledUsers, disabledUsers);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> searchUsers(String query) {
        String lowerQuery = query.toLowerCase();
        return userRepository.findAll().stream()
                .filter(user ->
                        user.getUsername().toLowerCase().contains(lowerQuery) ||
                                user.getEmail().toLowerCase().contains(lowerQuery))
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public Users getCurrentUser(Authentication authentication) {
        log.debug("Getting current user from authentication");
        String username = authentication.getName();
        log.debug("Username from authentication: {}", username);

        Optional<Users> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            log.error("User not found in database: {}", username);
            throw new RuntimeException("User not found");
        }

        Users user = userOpt.get();
        log.debug("User found in database: id={}, username={}, role={}",
                user.getId(), user.getUsername(), user.getRole());
        return user;
    }

    public boolean verifyPassword(Users user, String rawPassword) {
        return passwordEncoder.matches(rawPassword, user.getPassword());
    }

    public void updatePassword(Users user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }
}