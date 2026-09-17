---
title: Why our Spring Boot service leaked threads under load
dek: The thread pool looked healthy until it wasn't. A walk through a blocking downstream call, an unbounded queue, and reading a flame graph that finally made it obvious.
date: 2026-02-09
readTime: 7 min read
tags: ["Spring Boot", "JVM", "Performance"]
---

A service that had run fine for months started falling over roughly once a day, always after a few hours of steady traffic. Memory climbed slowly, then requests started timing out, then it OOM-ed and restarted. The restart "fixed" it — which is the most dangerous kind of fix, because it hides the cause.

## The problem

The service takes an incoming request, calls a downstream inventory API, and returns a combined response. To parallelise a few of those downstream calls, someone had wired up an `ExecutorService`:

```java
ExecutorService pool = Executors.newFixedThreadPool(50);
```

`newFixedThreadPool` looks bounded and safe — 50 threads, that's it. The trap is what backs it: an **unbounded** `LinkedBlockingQueue`. The thread count is capped, but the *queue of waiting work is not*.

## What we saw

Metrics were quietly misleading. Active thread count sat pinned at 50 — the pool was fully busy but not "growing," so nothing screamed. The real signal was elsewhere: the executor's queue depth climbed without limit, and heap grew right alongside it, because every queued task held references to its request context.

The downstream inventory API had gotten slow — its p99 had crept from 80 ms to 900 ms. At our request rate, tasks arrived faster than 50 threads could drain them at 900 ms each. The excess didn't get rejected; it piled into the unbounded queue. Given enough hours, that queue ate the heap.

## Finding it

Two tools made it obvious.

A thread dump showed all 50 pool threads parked in a socket read on the inventory client — every one of them blocked on the slow downstream, none of them stuck on a lock or deadlocked.

Then a flame graph from a few minutes of profiling showed almost all wall-clock time under the inventory call's `read()`. The CPU was nearly idle; the threads were just *waiting*. That combination — busy pool, idle CPU, growing queue, growing heap — is the signature of a bounded pool feeding on an unbounded queue behind a slow dependency.

## The fix

**1. Bound the queue and set a rejection policy.** Backpressure beats silent buildup. If we can't keep up, fail fast and shed load rather than queue forever:

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    20, 50,
    60L, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(200),          // bounded!
    new ThreadPoolExecutor.CallerRunsPolicy() // apply backpressure
);
```

**2. Put a real timeout on the downstream call** so a slow dependency can't hold a thread hostage indefinitely:

```java
var request = HttpRequest.newBuilder(uri)
    .timeout(Duration.ofMillis(500))
    .build();
```

**3. Add a circuit breaker** (Resilience4j) so that when inventory is unhealthy, we stop hammering it and fail fast instead of parking threads on it.

## The result

Under the same load, heap flattened and stayed flat. When the downstream slowed again a week later, the service shed a small fraction of requests with a clean 503 and a retry hint — and stayed up — instead of silently queueing itself to death. No more daily 3 a.m. restarts.

## Lessons

- **`newFixedThreadPool` is only half-bounded.** The threads are capped; the queue behind them isn't. Prefer an explicit `ThreadPoolExecutor` with a bounded queue.
- **An unbounded queue turns a slow dependency into an OOM.** The memory leak wasn't objects you forgot to free — it was work you never stopped accepting.
- **"A restart fixes it" means you have a slow leak, not a random crash.** Time-to-failure that scales with uptime is the clue.
- **Thread dump + flame graph together beat guessing.** Busy pool with idle CPU points straight at blocking I/O.
