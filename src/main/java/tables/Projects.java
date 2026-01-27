package tables;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "projects", indexes = {
    @Index(name = "idx_projects_created_by", columnList = "created_by"),
    @Index(name = "idx_projects_assigned_to", columnList = "assigned_to"),
    @Index(name = "idx_projects_is_global", columnList = "is_global"),
    @Index(name = "idx_projects_status", columnList = "status"),
    @Index(name = "idx_projects_priority", columnList = "priority"),
    @Index(name = "idx_projects_github_url", columnList = "github_url", unique = true),
    @Index(name = "idx_projects_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
public class Projects {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectPriority priority;

    @Column(name = "progress", nullable = false)
    private Integer progress = 0;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "is_global", nullable = false)
    private Boolean isGlobal = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private Users createdBy;

    @Column(name = "github_url", unique = true)
    private String githubUrl;

    @Column(name = "is_github_import")
    private Boolean isGithubImport = false;

    public enum ProjectStatus {
        PLANNING,
        IN_PROGRESS,
        ON_HOLD,
        COMPLETED,
        CANCELLED
    }

    public enum ProjectPriority {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public Projects(String name, String description, ProjectStatus status,
                    ProjectPriority priority, LocalDate startDate, LocalDate endDate,
                    Users createdBy, Boolean isGlobal) {
        this.name = name;
        this.description = description;
        this.status = status;
        this.priority = priority;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdBy = createdBy;
        this.isGlobal = isGlobal;
    }
}