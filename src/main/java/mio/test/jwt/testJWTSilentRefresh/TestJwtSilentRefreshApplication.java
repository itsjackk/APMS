package mio.test.jwt.testJWTSilentRefresh;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"config", "controller", "service", "repository", "tables", "dto"})
@EnableScheduling
@EntityScan(basePackages = "tables")
@EnableJpaRepositories(basePackages = "repository")
public class TestJwtSilentRefreshApplication {

    public static void main(String[] args) {
        SpringApplication.run(TestJwtSilentRefreshApplication.class, args);
    }

}
