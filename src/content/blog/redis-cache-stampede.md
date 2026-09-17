---
title: The cache stampede that took down checkout
dek: One Redis key expired at peak traffic and 4,000 requests hammered the database in the same second. Here's how request coalescing and a jittered TTL fixed it for good.
date: 2026-03-03
readTime: 6 min read
tags: ["Redis", "Caching", "Reliability"]
---

Checkout went down for 90 seconds during a flash sale. No deploy, no infra change, no traffic spike beyond what we'd planned for. The database just fell over — and then recovered on its own. That "recovered on its own" part is what told me what happened.

## The problem

We cache the pricing config — tax rules, active promotions, currency rates — in Redis under a single key with a 10-minute TTL. Every checkout request reads it. On a cache hit it's a sub-millisecond lookup. On a miss, the request rebuilds the config from the database, a query that takes about 300 ms.

During the sale we were doing roughly 4,000 checkouts per second. When that one key expired, **every one of those 4,000 concurrent requests missed at the same instant**, and all of them tried to rebuild the config from the database simultaneously. The DB went from comfortable to saturated in one tick, queries queued, timeouts cascaded, checkout died.

Then the first query finished, repopulated the cache, and everything recovered — until the next expiry.

This is a **cache stampede** (also called a dogpile or thundering herd). The cache working perfectly is exactly what sets it up: the more traffic you have, the harder the herd hits.

## What we tried first

The tempting fix is "just make the TTL longer." That only makes the outage rarer, not gone — and staler pricing is its own problem. We needed the miss itself to stop being dangerous.

## The fix

Two changes solved it together.

**1. Request coalescing (a mutex on the rebuild).** When the key is missing, only *one* request should rebuild it; everyone else waits briefly and reads the fresh value. We used a short-lived Redis lock:

```java
public PricingConfig get() {
    String cached = redis.get(KEY);
    if (cached != null) return deserialize(cached);

    // Only one caller wins the lock and rebuilds
    boolean gotLock = redis.set(LOCK_KEY, "1", "NX", "PX", 5000) != null;
    if (gotLock) {
        try {
            PricingConfig fresh = buildFromDb();      // the 300ms query
            redis.set(KEY, serialize(fresh), "PX", ttlWithJitter());
            return fresh;
        } finally {
            redis.del(LOCK_KEY);
        }
    }

    // Everyone else waits a beat and re-reads the now-warm cache
    sleep(50);
    String warm = redis.get(KEY);
    return warm != null ? deserialize(warm) : buildFromDb();
}
```

**2. Jittered TTL.** Even with coalescing, having many keys expire on the exact same schedule is asking for trouble. We spread expiry out with a random offset so keys never expire in lockstep:

```java
private long ttlWithJitter() {
    long base = Duration.ofMinutes(10).toMillis();
    long jitter = ThreadLocalRandom.current().nextLong(0, 90_000); // up to 90s
    return base + jitter;
}
```

For extra safety you can also refresh *before* expiry (serve slightly stale while a background task rebuilds), but coalescing plus jitter was enough for us.

## The result

We re-ran the same load in staging. On expiry, the database now sees **exactly one** rebuild query instead of thousands. Checkout stayed flat through every expiry cycle. The next real sale passed without a blip.

## Lessons

- **A cache miss under high concurrency is a load multiplier,** not a minor slowdown. One expiry became 4,000 identical queries.
- **Longer TTLs hide stampedes; they don't fix them.** Make the miss safe instead.
- **Never let many keys share an expiry instant** — jitter every TTL.
- **The "recovered on its own" outage is a strong stampede signal.** Self-healing without intervention usually means something briefly overwhelmed a resource and then relieved it.
