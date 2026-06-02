# Upgrading the Postgres Samples to Reveal SDK 2.0

This document records the changes made to move this repo (client + all four server
platforms) from Reveal SDK **1.8.3** to **2.0**, while keeping **Postgres** as the data
source on every platform.

> **Database:** Unchanged. Every server still uses the Postgres connector and the Northwind
> Postgres database. The 1.x → 2.0 work is purely an SDK upgrade.

## At a glance

| Platform | Effort | Headline change |
|----------|--------|-----------------|
| **Java** | Large (rewrite) | Jersey-based `com.infragistics.reveal.sdk:reveal-sdk` → servlet-based `io.revealbi:reveal-sdk-servlet` |
| **Client** | Medium | jQuery plugin (`$.ig.*` + `infragistics.reveal.js`) → ES module import from the `reveal-sdk` npm package |
| **ASP.NET** | Small | NuGet version bumps 1.8.3 → 2.0.0 + one API change (`GetInfoAsync` → `GetInfo`) |
| **Node (JS + TS)** | Small | `reveal-sdk-node` `^1.8.3` → `^2.0.0` (no API/source changes) |

Two cross-cutting decisions were applied:

1. **Ports unified on `5111`** (previously ASP.NET/Java were on `5117`, Node on `5111`).
   The shared client base URL is now `http://localhost:5111/`.
2. **Environment variables renamed `SQL_SERVER_*` → `POSTGRES_*`** across the Node servers
   (the Java server already used `POSTGRES_*`; ASP.NET uses the `Server` config section).

---

## Java — the big one

The 1.x Java server ran on **Spring Boot + Jersey (JAX-RS)** and the
`com.infragistics.reveal.sdk:reveal-sdk` 1.8.3 jar. Reveal 2.0 ships a brand-new
**servlet-based** SDK, `io.revealbi:reveal-sdk-servlet:2.0.0`, with a completely different
package root (`io.revealbi.core.*` / `io.revealbi.core.data.*`) and bootstrap model.

### `pom.xml`

- Removed `spring-boot-starter-jersey` and the `provided` `spring-boot-starter-tomcat`.
- Removed `com.infragistics.reveal.sdk:reveal-sdk:1.8.3`.
- Added `io.revealbi:reveal-sdk-servlet:2.0.0`.
- Added the `release-stage` Maven repository.
- `war` packaging + `SpringBootServletInitializer` retained (embedded Tomcat now comes from
  `spring-boot-starter-web`).

### Bootstrap — `RevealApplication.java`

The engine is now an `io.revealbi.servlet.RevealEngineServlet`, built with a
`io.revealbi.core.RevealServerBuilder` and registered as a servlet:

```java
RevealEngineServlet servlet = new RevealEngineServlet(
    new RevealServerBuilder()
        .setAuthenticationProvider(authenticationProvider)
        .setDataSourceProvider(dataSourceProvider)
        .setDashboardProvider(dashboardProvider)
        .setObjectFilter(objectFilter)
        .build(),
    userContextProvider);
new ServletRegistrationBean<>(servlet, "/*"); // async-supported, load-on-startup
```

### Routing (why it looks the way it does)

In 1.x, Jersey served **both** the Reveal engine and the helper endpoints
(`/dashboards/names`, `/dashboards/visualizations`) at `/`. In 2.0 the engine is a standalone
servlet, so to keep the client's base URL at the server root (`http://localhost:5111/`,
matching ASP.NET and Node) the engine is mounted at **`/*`** and the helpers are carved out
using the Servlet spec's mapping-precedence rules:

| Path | Servlet | Why it wins over `/*` |
|------|---------|----------------------|
| `/dashboards/names`, `/dashboards/visualizations` | `DashboardController` | exact-path mapping beats `/*` |
| `/images/*` | `ImagesServlet` | longer path-prefix mapping beats `/*` |
| everything else | `RevealEngineServlet` | the `/*` catch-all |

- `DashboardController` is the old `DomController` ported from JAX-RS (`@Path`/`@GET`) to a
  plain `jakarta.servlet.http.HttpServlet` (serializes with Jackson).
- `ImagesServlet` replaces the old `WebConfig` resource handler, which can no longer fire
  because Spring MVC's `DispatcherServlet` is shadowed by the root-mounted engine servlet. It
  streams the bundled chart-type PNGs from `classpath:/static/images/`.

### Provider classes

All providers moved from `com.infragistics.reveal.sdk.*` to `io.revealbi.core.*` /
`io.revealbi.core.data.*`. The Postgres data classes and their methods are unchanged in name —
only the package root differs:

| Concern | 1.x | 2.0 |
|---------|-----|-----|
| Data source | `…api.model.RVPostgresDataSource` | `io.revealbi.core.data.RVPostgresDataSource` |
| Data source item | `…api.model.RVPostgresDataSourceItem` | `io.revealbi.core.data.RVPostgresDataSourceItem` |
| Function call | `setFunctionName` / `setFunctionParameters` | *(same)* |
| User context provider | extends `RVContainerRequestAwareUserContextProvider` (reads `ContainerRequestContext`) | implements `io.revealbi.servlet.IRVServletUserContextProvider` (reads `HttpServletRequest`) |
| Object filter | `IRVObjectFilter` with a 2nd `RVDashboardDataSource` overload | `IRVObjectFilter` — that overload is gone |
| CORS | Jersey `CorsFilter` (`ContainerRequestFilter`) | `PermissiveCorsFilter` (`jakarta.servlet.Filter`) |

### Files deleted

`RevealJerseyConfig.java`, `CorsFilter.java`, `DomController.java`, `WebConfig.java`.

### Files added

`PermissiveCorsFilter.java`, `DashboardController.java`, `ImagesServlet.java`.

> ✅ Verified with `./mvnw.cmd -DskipTests clean compile` — the migrated sources compile
> against `reveal-sdk-servlet:2.0.0`.

---

## Client — jQuery plugin → ES module

Reveal 2.0 is consumed as an **ES module** instead of the `infragistics.reveal.js` global
plugin. jQuery and dayjs are no longer required.

**Before (1.x):**
```html
<script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
<script src="https://unpkg.com/dayjs@1.8.21/dayjs.min.js"></script>
<script src="https://dl.revealbi.io/reveal/libs/1.8.3/infragistics.reveal.js"></script>
<script type="text/javascript">
    $.ig.RevealSdkSettings.setBaseUrl("http://localhost:5117/");
    var revealView = new $.ig.RevealView("#revealView");
    var ds = new $.ig.RVPostgresDataSource();
</script>
```

**After (2.0):**
```html
<script>window.revealDisableKeyboardManagement = true;</script>
<script type="module">
    import { RevealView, RevealSdkSettings, RVDashboard, RVDashboardDataType,
             RVPostgresDataSource, RVPostgresDataSourceItem, RevealDataSources }
        from "https://cdn.jsdelivr.net/npm/reveal-sdk/dist/reveal-sdk.esm.js";

    RevealSdkSettings.setBaseUrl("http://localhost:5111/");
    var revealView = new RevealView("#revealView");
    var ds = new RVPostgresDataSource();
</script>
```

Mapping applied across `load-dashboard.html`, `index-ds.html`, `index-dsi.html`:

| 1.x | 2.0 |
|-----|-----|
| `$.ig.RevealView` | `RevealView` |
| `$.ig.RVDashboard` | `RVDashboard` |
| `$.ig.RevealSdkSettings` | `RevealSdkSettings` |
| `$.ig.RevealDataSources` | `RevealDataSources` |
| `$.ig.RVPostgresDataSource(Item)` | `RVPostgresDataSource(Item)` |
| `$.ig.RVDashboardDataType` | `RVDashboardDataType` |
| `$(document).ready(...)` | top-level code (module scripts defer) |
| `$('#id').val()` | `document.getElementById('id').value` |

> In production, download the `reveal-sdk` package and import locally instead of from a CDN.

---

## ASP.NET — version bump + one API change

The provider classes are source-compatible in 2.0 (`RegisterPostgreSQL()`, `RVPostgresDataSource`,
`RVPostgresDataSourceItem`, `FunctionName`/`FunctionParameters` all unchanged). Two edits were
needed beyond the package bump:

- `RevealSdk.Server.csproj`: `Reveal.Sdk.AspNetCore` and `Reveal.Sdk.Data.PostgreSQL`
  `1.8.3` → `2.0.0`.
- `Program.cs`: the `Dashboard` thumbnail helper changed — the async
  `await dashboard.GetInfoAsync(name)` was **removed in 2.0** in favor of the synchronous
  `dashboard.GetInfo(name)`. The `/dashboards/{name}/thumbnail` lambda is no longer `async`:

  ```csharp
  // 1.x
  var info = await dashboard.GetInfoAsync(Path.GetFileNameWithoutExtension(path));
  // 2.0
  var info = dashboard.GetInfo(Path.GetFileNameWithoutExtension(path));
  ```

- `Properties/launchSettings.json`: app URL `5117` → `5111`.

> ✅ Verified with `dotnet build` against `Reveal.Sdk.AspNetCore 2.0.0` /
> `Reveal.Sdk.Data.PostgreSQL 2.0.0`.

---

## Node (JS + TS) — version bump only

The Postgres provider code is unchanged; only the package version changed.

- `reveal-sdk-node` `^1.8.3` → `^2.0.0` in both `server/node-js` and `server/node-ts`.
- `node-ts` also bumps `nodemon` `^2.0.20` → `^3.1.10`.
- Env vars renamed `SQL_SERVER_*` → `POSTGRES_*` (`.env`, `.env.example`, `reveal.js`/`reveal.ts`, READMEs).
- Run `npm install` after pulling to refresh `package-lock.json` to the 2.0 dependency tree.

---

## Post-upgrade checklist

- [ ] `cd server/java && ./mvnw spring-boot:run` → open `http://localhost:5111/load-dashboard.html`
- [ ] `cd server/node-js && npm install && npm start`
- [ ] `cd server/node-ts && npm install && npm start`
- [ ] `cd server/aspnet && dotnet run` (from the `RevealSdk.Server` project)
- [ ] Confirm dashboards load and the data-source dialogs (`index-ds`, `index-dsi`) work
- [ ] Set your Reveal **2.0 trial/license key** — 1.x keys are not valid for 2.0
