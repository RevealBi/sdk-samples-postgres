package com.server.reveal;

import io.revealbi.core.IRVUserContext;
import io.revealbi.core.RVUserContext;
import io.revealbi.servlet.IRVServletUserContextProvider;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.HashMap;

@Component
public class UserContextProvider implements IRVServletUserContextProvider {

    @Value("${POSTGRES_HOST:localhost}")
    private String postgresHost;

    @Value("${POSTGRES_DATABASE:Northwind}")
    private String postgresDatabase;

    @Value("${POSTGRES_USERNAME:postgres}")
    private String postgresUsername;

    @Value("${POSTGRES_PASSWORD:}")
    private String postgresPassword;

    @Value("${POSTGRES_SCHEMA:public}")
    private String postgresSchema;

    @Override
    public IRVUserContext getUserContext(HttpServletRequest request) {
        String headerValue = request.getHeader("x-header-one");
        String userId = null;
        String orderId = null;

        if (headerValue != null && !headerValue.isEmpty()) {
            String[] pairs = headerValue.split(",");
            for (String pair : pairs) {
                String[] kv = pair.split(":", 2);
                if (kv.length == 2) {
                    String key = kv[0].trim();
                    String value = kv[1].trim();
                    if (key.equalsIgnoreCase("userId")) {
                        userId = value;
                    } else if (key.equalsIgnoreCase("orderId")) {
                        orderId = value;
                    }
                }
            }
        }

        // default to User role
        String role = "User";

        // null is used here just for demo
        if ("BLONP".equals(userId) || userId == null) {
            role = "Admin";
        }

        String[] filterTables = role.equals("Admin")
            ? new String[0]
            : new String[]{"customers", "orders"};

        var props = new HashMap<String, Object>();
        props.put("OrderId", orderId != null ? orderId : "");
        props.put("Role", role);
        props.put("Host", postgresHost);
        props.put("Database", postgresDatabase);
        props.put("Username", postgresUsername);
        props.put("Password", postgresPassword);
        props.put("Schema", postgresSchema);
        props.put("FilterTables", filterTables);

        return new RVUserContext(userId, props);
    }
}
