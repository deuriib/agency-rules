---
name: async-messaging
description: Use when publishing or consuming messages over a broker, to make consumers idempotent, isolate poison messages, and separate business from technical failures.
trigger: model_decision
tags: [dotnet, messaging, rabbitmq, reliability]
---

# Asynchronous Messaging

- **Idempotency is mandatory.** Every consumer must tolerate duplicate delivery. Key on a business identity (`OrderId`, `EventId`) and detect re-processing so a redelivery cannot double-apply a side effect. Assume the broker will redeliver.
- **Durable queues with a dead-letter queue.** Declare durable queues and route failed messages to a DLQ instead of dropping them. A poison message must be parked for diagnosis, not retried forever.
- **Retry with exponential backoff, then DLQ.** Retry transient failures with backoff and a bounded count; after the limit, send to the DLQ. Never hot-loop a failing message.
- **Separate business from technical failure.** A rejected payment is a business outcome — stop the logical flow, do not retry it. A thrown exception is a technical failure — retry, then DLQ. Conflating the two turns a normal rejection into a poison loop.
- **Publish after commit.** Emit the message only after the local transaction is committed, or use the outbox pattern, so a message never announces a change that did not persist.
- **A consumer owns its schema and tolerates evolution.** Deserialize defensively and ignore unknown fields; a new producer field must not break an old consumer.
