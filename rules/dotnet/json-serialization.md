---
name: json-serialization
description: Use when configuring or writing System.Text.Json in .NET, to use source generation, handle polymorphism explicitly, and stay trim/AOT-safe.
trigger: model_decision
tags: [dotnet, json, serialization]
---

# JSON Serialization (System.Text.Json)

- **Source generation, not reflection.** Generate a `JsonSerializerContext` (`[JsonSerializable]`) and pass it to `Serialize`/`Deserialize`. It is faster, avoids the reflection-based `JsonSerializerOptions`, and is required for trimming and AOT.
- **Configure options once, centrally.** Set naming policy, `PropertyNamingPolicy`, and converters in one `JsonSerializerOptions` (or the context) and reuse it. Per-call inline options drift and break caching of the serializer metadata.
- **Polymorphism is explicit.** Mark a base type with `[JsonPolymorphic]` and its derived types with `[JsonDerivedType]`. Serializing a derived type without this loses the type on the way back.
- **Model nullability deliberately.** Use `JsonIgnoreCondition.WhenWritingNull` and `required` properties so "missing" and "null" mean what the contract says, not what the default does.
- **Traverse read-only JSON with `JsonDocument`.** For inspecting a payload you do not need to bind, use `JsonDocument`/`JsonElement` — never parse with a string or `JObject` after `System.Text.Json`.
- **Custom converters are the exception.** Reach for a converter only when the default cannot express the shape. A converter that reimplements the whole object model is a sign you are fighting the serializer.
- **Do not serialize `Exception`, `Type`, cycles, or secrets.** These either do not round-trip, blow up, or leak. Use a DTO, never the domain or a live object graph.
