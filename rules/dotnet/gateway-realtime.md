---
name: gateway-realtime
description: Use when routing traffic through YARP or hosting SignalR, to forward WebSockets correctly and pin sessions to the right backend.
trigger: model_decision
tags: [dotnet, yarp, signalr, websocket]
---

# Gateway and Real-time (YARP + SignalR)

- **Declare routes and clusters in config.** Define `/hub/{**catch-all}` and its clusters in `appsettings.json` rather than hard-coding proxies in code, so routing is visible and changeable without a rebuild.
- **Enable WebSockets before routing.** Call `app.UseWebSockets()` so YARP forwards WebSocket upgrade requests correctly. A SignalR connection over YARP without it silently degrades.
- **Session affinity for SignalR.** Enable `SessionAffinity` with a cookie-based policy so a client stays pinned to the same backend for the life of the connection. Without affinity, each message can hit a different server and lose hub state.
- **Load-balance by connection, not request.** A SignalR connection is long-lived and stateful; the load balancer and affinity policy must respect that rather than round-robin every message.
- **Keep the hub thin.** A hub method validates, delegates to an application use case, and broadcasts a typed result. Business logic and persistence live outside the hub so it stays a transport, not a service.
