---
title: How we cut Kafka consumer lag from 40s to 2s
dek: A debugging story about a poison pill, an endless rebalance loop, and one very wrong max.poll.records. What we thought was broken vs. what actually was.
date: 2026-04-12
readTime: 8 min read
tags: ["Kafka", "Debugging", "Distributed Systems"]
---

The alert came in at 2 a.m.: consumer lag on our orders topic was climbing past 40 seconds and not coming back down. Downstream, customers were seeing "payment processing" spinners that never resolved. By the time I was at my laptop, lag was at 90 seconds and growing.

## The problem

We run a consumer group of six instances reading an orders topic partitioned twelve ways. Normal lag sits under a second. That night, one partition's lag was pinned high while the others looked fine — a shape that usually means a single slow or stuck consumer, not a topic-wide overload.

The first instinct was "traffic spike." It wasn't. Producer throughput was flat. Whatever was wrong, we were failing to *keep up* with a load we'd handled fine an hour earlier.

## What we thought was wrong

My first three guesses were all wrong, and each one cost time:

- **A slow database.** Query p99 was normal. Not it.
- **Undersized consumers.** We scaled the group from six to nine. Lag kept climbing. Adding consumers to a stuck partition does nothing — the extra instances just sat idle because partitions were already assigned.
- **A GC pause.** Heap and GC logs were clean.

The tell I missed for too long: the group was **rebalancing over and over**. Every time it rebalanced, processing stopped for a few seconds while partitions got reassigned, then started again — and immediately triggered another rebalance.

## The actual cause

Two things were compounding.

First, a **poison pill**: one malformed message on that partition threw an exception in our deserializer. We caught it, logged it, and — crucially — *didn't advance the offset*. So the consumer re-read the same bad message forever.

Second, `max.poll.records` was set to **2000**. Combined with a heavier-than-usual per-record handler, a single `poll()` batch was taking longer than `max.poll.interval.ms` (5 minutes default, but we'd lowered it). Kafka assumed the consumer was dead, kicked it from the group, and triggered a rebalance. Repeat forever.

## The fix

Three changes, smallest blast radius first.

**1. Stop the poison pill from blocking the partition.** We moved bad records to a dead-letter topic and advanced past them instead of retrying in place:

```java
try {
    process(record);
} catch (DeserializationException e) {
    deadLetterProducer.send(toDlt(record));
    // advance past the bad offset so we never re-read it
    log.warn("Routed poison pill to DLT: {}", record.offset(), e);
}
```

**2. Right-size the poll batch** so a batch reliably finishes inside the poll interval:

```properties
max.poll.records=200
max.poll.interval.ms=300000
```

**3. Add a jittered backoff** on transient handler failures so one flaky downstream call couldn't stall the whole batch.

## The result

Lag drained from 90 seconds back under 2 within a few minutes of the deploy. The rebalance storm stopped completely — the group has held stable assignments since.

## Lessons

- **Repeated rebalances are a symptom, not noise.** If your group keeps rebalancing, something is timing out inside `poll()`. Look there first.
- **A poison pill on one partition looks exactly like a slow consumer.** Per-partition lag that's high on *one* partition is a strong hint.
- **Adding consumers can't fix a stuck partition.** Scale-out only helps when the bottleneck is throughput, not a wedged offset.
- **Tune `max.poll.records` against your real per-record cost,** not a copied-from-a-blog default.

If you've fought a rebalance storm too, I'd love to hear how yours started — the trigger is almost always something small.
