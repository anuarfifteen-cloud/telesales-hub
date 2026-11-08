/**
 * Entity read guard.
 *
 * The platform allows 70 list/filter reads per 60s for each caller, and this app
 * mounts many screens that read the same records at the same moment. Two
 * protections keep that from surfacing as a "Rate limit exceeded" error:
 *   - identical list/filter calls made while one is already in flight share its
 *     result, so one screen change fires one request instead of one per
 *     component that wants the same rows;
 *   - a rate-limited read is retried once after the window the API reports, so
 *     a short burst resolves itself instead of throwing at the caller.
 * Every other entity operation (get, create, update, delete, subscribe, count,
 * aggregate…) passes straight through untouched.
 */

const RETRY_MS = 2000;

const READ_METHODS = new Set(["list", "filter"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readKey(entityName, method, args) {
  try {
    return `${entityName}:${method}:${JSON.stringify(args)}`;
  } catch {
    return null;
  }
}

function isRateLimited(err) {
  const message = String(
    err?.message || err?.response?.data?.message || err?.data?.message || ""
  );
  return /rate limit/i.test(message);
}

export function guardEntityReads(client) {
  // In-flight reads only: a shared promise is dropped the moment it settles, so
  // no caller is ever handed a stale record.
  const pending = new Map();
  const wrapped = new Map();
  let entitiesProxy = null;

  const readOnce = (entityName, entity, method, args) => {
    const key = readKey(entityName, method, args);
    if (key && pending.has(key)) return pending.get(key);

    const run = (async () => {
      try {
        try {
          return await entity[method](...args);
        } catch (err) {
          if (!isRateLimited(err)) throw err;
          await sleep(RETRY_MS);
          return await entity[method](...args);
        }
      } finally {
        if (key) pending.delete(key);
      }
    })();

    if (key) pending.set(key, run);
    return run;
  };

  const wrapEntity = (name) => {
    if (wrapped.has(name)) return wrapped.get(name);
    const entity = client.entities[name];
    if (!entity) return entity;

    const proxy = new Proxy(entity, {
      get(target, prop) {
        if (typeof prop === "string" && READ_METHODS.has(prop)) {
          return (...args) => readOnce(name, target, prop, args);
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    wrapped.set(name, proxy);
    return proxy;
  };

  return new Proxy(client, {
    get(target, prop) {
      if (prop !== "entities") {
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      }
      if (!entitiesProxy) {
        const raw = target.entities;
        entitiesProxy = new Proxy(raw, {
          get(rawEntities, name) {
            if (typeof name !== "string") {
              return Reflect.get(rawEntities, name, rawEntities);
            }
            if (!rawEntities[name]) return rawEntities[name];
            return wrapEntity(name);
          },
        });
      }
      return entitiesProxy;
    },
  });
}