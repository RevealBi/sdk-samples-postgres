# Reveal BI — Java / Postgres Server (SDK 2.0)

Spring Boot 3 server using the Reveal Java SDK **2.0** (`io.revealbi:reveal-sdk-servlet`) with a
**Postgres** backend (Northwind). The Reveal engine is mounted at the server root so the shared
HTML client can keep its base URL at `http://localhost:5111/`.

## Run

Set your Postgres credentials in `src/main/resources/application.properties` (copy from
`application.properties.example`) or as environment variables (`POSTGRES_HOST`,
`POSTGRES_DATABASE`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`, `POSTGRES_SCHEMA`).

**Windows (PowerShell):**
```powershell
.\mvnw.cmd spring-boot:run
```

**macOS/Linux:**
```bash
./mvnw spring-boot:run
```

The server listens on `5111` (`server.port`). Then open `http://localhost:5111/load-dashboard.html`
(or `index.html`, `index-ds.html`, `index-dsi.html`) from the `client/` folder.

## Routing

In 1.x, Jersey served both the Reveal engine and the helper endpoints at `/`. The 2.0 engine is a
standalone servlet, so to keep the client base URL at the server root the engine is mounted at
`/*` and the helpers are carved out using Servlet mapping precedence (exact and longer-prefix
mappings win over `/*`):

| Request | Handled by | Mapping |
|---------|-----------|---------|
| `GET /dashboards/names`, `GET /dashboards/visualizations` | `DashboardController` (`HttpServlet`) | exact path |
| `GET /images/*` | `ImagesServlet` (`HttpServlet`) | path prefix |
| everything else (the Reveal REST API) | `RevealEngineServlet` | `/*` catch-all |

## Files

- `RevealApplication.java` — Spring Boot entry point; registers the three servlets above. The
  Reveal engine is wired through `RevealServerBuilder` and registered with `setAsyncSupported(true)`.
- `UserContextProvider.java` — implements `io.revealbi.servlet.IRVServletUserContextProvider`,
  reads request headers + Postgres settings to build an `RVUserContext`.
- `AuthenticationProvider.java`, `DataSourceProvider.java`, `DashboardProvider.java`,
  `ObjectFilter.java` — the SDK providers used by `RevealServerBuilder` (Postgres data classes
  from `io.revealbi.core.data`).
- `PermissiveCorsFilter.java` — `jakarta.servlet.Filter` adding permissive CORS headers.
- `DashboardController.java` + `VisualizationChartInfo.java` — DOM helper endpoints
  (`/dashboards/names`, `/dashboards/visualizations`).
- `ImagesServlet.java` — serves the bundled chart-type PNGs from `classpath:/static/images/`.

## Migration from SDK 1.x

Migrated from `com.infragistics.reveal.sdk:reveal-sdk` 1.8.3 (Spring Boot + Jersey). See
[`UPGRADE-TO-2.0.md`](../../UPGRADE-TO-2.0.md) at the repo root for the full rationale.
