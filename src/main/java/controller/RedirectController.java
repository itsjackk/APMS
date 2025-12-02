
package controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RedirectController {

    private static final Logger log = LoggerFactory.getLogger(RedirectController.class);

    @GetMapping({"/", "/login", "/register", "/dashboard"})
    public String redirectToConsoleApp() {
        log.info("Root path redirect triggered, redirecting to /ConsoleApp/login");
        return "redirect:/ConsoleApp/login";
    }
}
