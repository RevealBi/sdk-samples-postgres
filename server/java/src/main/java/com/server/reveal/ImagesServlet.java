package com.server.reveal;

import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Serves the bundled chart-type images from classpath:/static/images/ at /images/*.
 *
 * <p>In the 1.x server these were served by Spring's {@code WebConfig} resource handler.
 * With the Reveal 2.0 engine mounted at "/*", Spring MVC's {@code DispatcherServlet} never
 * sees these requests, so this small servlet handles them directly. "/images/*" is a longer
 * path-prefix mapping than "/*", so it takes precedence over the Reveal servlet.
 */
public class ImagesServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String pathInfo = req.getPathInfo(); // e.g. "/grid.png"
        if (pathInfo == null || pathInfo.equals("/") || pathInfo.contains("..")) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        String resourcePath = "/static/images" + pathInfo;
        try (InputStream in = getClass().getResourceAsStream(resourcePath)) {
            if (in == null) {
                resp.sendError(HttpServletResponse.SC_NOT_FOUND);
                return;
            }

            resp.setContentType(contentTypeFor(pathInfo));
            try (OutputStream out = resp.getOutputStream()) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
            }
        }
    }

    private String contentTypeFor(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        return "application/octet-stream";
    }
}
