---
name: sync-messaging
description: Use when implementing point-to-point or request-reply messaging in .NET, to correlate the reply, bound the wait, and keep the receiver idempotent.
trigger: model_decision
tags: [dotnet, messaging, request-reply, masstransit, rabbitmq]
---

# Point-to-Point and Synchronous Messaging

The durability, idempotency, and dead-letter guarantees in `async-messaging`
still apply here — synchronous messaging changes the wait, not the delivery
contracts. This rule covers the request-reply shape built on a queue.

- **Point-to-point delivers to one consumer, not to everyone.** A queue hands each message to exactly one competing consumer, so scaling adds workers, not copies. Use a queue when one receiver must act; use a pub/sub exchange when many must react. Do not reach for a queue where you need broadcast.
- **Request-reply only when the caller needs the answer now.** Fire-and-forget stays on the async path. If the sender must have a result to continue, use request-reply; if not, publish and move on — blocking a queue into sync semantics for no reason adds latency and coupling.
- **Prefer real RPC for plain call-return.** When you do not need the broker's durability, routing, or back-pressure, use gRPC or HTTP. Reach for messaging request-reply when the queue's guarantees justify the extra hop.
- **Correlate the reply.** Match the response to the outstanding request with a `CorrelationId` (and `ReplyTo` on RabbitMQ). With MassTransit, `IRequestClient<T>.GetResponse<TResponse>(request)` wires this for you. A reply without correlation is a lost message.
- **Bound every wait with a timeout.** Pass a `RequestTimeout` (MassTransit defaults to 30 seconds) or a `CancellationToken`; a caller that waits forever is a hang. MassTransit surfaces the failure as `RequestTimeoutException` and a rejected request as `RequestFaultException` — handle both, do not swallow them.
- **Await, never block.** `await client.GetResponse<T>(...)`; `.Result` / `.Wait()` deadlock in a synchronization context. Async boundaries are a contract, not an implementation detail.
- **The receiver stays idempotent and fault-tolerant.** A request-reply message can still be redelivered. Keep the idempotency key and DLQ/retry behavior from `async-messaging`; "synchronous" describes the sender's wait, not a weaker delivery guarantee.
- **The reply is a response, not a new command.** Return a typed response DTO. If the result must trigger more work, dispatch a fresh message or command — do not overload the reply payload with side effects.
