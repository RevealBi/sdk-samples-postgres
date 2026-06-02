package com.server.reveal;

import io.revealbi.core.RevealServerBuilder;
import io.revealbi.servlet.RevealEngineServlet;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class RevealApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(RevealApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(RevealApplication.class);
    }

    /**
     * The Reveal SDK 2.0 engine, mounted at the root ("/*") so the JavaScript client can
     * keep its base URL pointed at the server root (e.g. http://localhost:5111/) exactly as
     * it did with the 1.x Jersey server. The helper endpoints below are mapped to more
     * specific paths, which take precedence over this catch-all per the Servlet spec, so
     * they continue to fall through to {@link DashboardController} / {@link ImagesServlet}.
     */
    @Bean
    ServletRegistrationBean<RevealEngineServlet> revealServlet(AuthenticationProvider authenticationProvider,
                                                               DataSourceProvider dataSourceProvider,
                                                               DashboardProvider dashboardProvider,
                                                               ObjectFilter objectFilter,
                                                               UserContextProvider userContextProvider) {
        RevealEngineServlet revealEngineServlet = new RevealEngineServlet(
            new RevealServerBuilder()
                .setAuthenticationProvider(authenticationProvider)
                .setDataSourceProvider(dataSourceProvider)
                .setDashboardProvider(dashboardProvider)
                .setObjectFilter(objectFilter)
                .build(),
            userContextProvider
        );

        ServletRegistrationBean<RevealEngineServlet> registration =
            new ServletRegistrationBean<>(revealEngineServlet, "/*");
        registration.setName("revealEngineServlet");
        registration.setAsyncSupported(true);
        registration.setLoadOnStartup(1);
        return registration;
    }

    /**
     * DOM helper endpoints. Exact-path mappings win over the Reveal servlet's "/*", so
     * GET /dashboards/names and GET /dashboards/visualizations are handled here rather
     * than being interpreted by the Reveal engine as dashboard ids.
     */
    @Bean
    ServletRegistrationBean<DashboardController> dashboardController() {
        ServletRegistrationBean<DashboardController> registration =
            new ServletRegistrationBean<>(new DashboardController(),
                "/dashboards/names", "/dashboards/visualizations");
        registration.setName("dashboardController");
        registration.setLoadOnStartup(2);
        return registration;
    }

    /**
     * Serves the bundled chart-type PNGs referenced by /dashboards/visualizations.
     * "/images/*" is a longer path-prefix mapping than the Reveal servlet's "/*", so it wins.
     */
    @Bean
    ServletRegistrationBean<ImagesServlet> imagesServlet() {
        ServletRegistrationBean<ImagesServlet> registration =
            new ServletRegistrationBean<>(new ImagesServlet(), "/images/*");
        registration.setName("imagesServlet");
        registration.setLoadOnStartup(3);
        return registration;
    }
}
