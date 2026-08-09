// ---------------------------------------------------------------------------
// PATCH for nmplotter-routes — the LIST name fault
//
// WHERE: inside `export default { async fetch }`, the LIST branch
//        `if (request.method === 'GET' && !id) { ... }`
//
// WHY: the plain list takes each name from KV list METADATA:
//
//        name: (k.metadata && k.metadata.name) || k.name.slice(prefix.length)
//
//      ?full=1 does not — it reads the stored BODY and returns body.name.
//      The live test showed those two disagreeing for the same record: the
//      body was right, the metadata was wrong. Whatever the cause inside KV,
//      metadata is the only difference between the path that is right and the
//      path that is wrong, so the fix is to stop depending on it for the name.
//
//      This matters because the plain list is what the Saved Routes cloud
//      list shows, and what the waypoint uploader checks against.
//
// COST: one KV read per record instead of none. Measured on the live Worker,
//      ?full=1 already does exactly this and answers in 0.5-1.1 s for these
//      collection sizes. A names-only list is lighter than that, because it
//      throws the bodies away instead of returning them.
//
// NOT CHANGED: the sort, the `routes` alias, ?full=1, or anything else.
// ---------------------------------------------------------------------------

// REPLACE the whole `} else {` branch of the LIST handler with this:

        } else {
          // Read the body for the name rather than trusting list metadata.
          // `updated` still comes from metadata: it is written at the same
          // moment and nothing has shown it to be wrong.
          items = await Promise.all(list.keys.map(async (k) => {
            const idv = k.name.slice(prefix.length);
            let name = null;
            try {
              const raw = await env.ROUTES.get(k.name);
              if (raw) {
                const body = JSON.parse(raw);
                if (body && typeof body.name === 'string' && body.name) name = body.name;
              }
            } catch (_) { /* fall through to the metadata name */ }
            return {
              id: idv,
              name: name || (k.metadata && k.metadata.name) || idv,
              updated: (k.metadata && k.metadata.updated) || null,
            };
          }));
        }

// ---------------------------------------------------------------------------
// SEPARATELY, two things worth knowing about this Worker. Neither is a bug and
// neither needs changing today.
//
// 1. THE KEY IS THE LIBRARY. There is no comparison against a stored secret:
//    the key is hashed into a storage namespace, so a wrong key returns 200
//    with an empty list because it is addressing a library that does not
//    exist. That is a sound design for what this is. Its real limits are that
//    the minimum length is 6 characters, and there is no rate limiting -- so
//    the passphrase should be long, and it is the only thing protecting the
//    data.
//
// 2. IDS ARE TRUNCATED AT 80 CHARACTERS (`parts[1] ... .slice(0, 80)`), so two
//    ids that agree for their first 80 characters would collide. Nothing the
//    app generates comes close, so this is a note rather than a fault.
// ---------------------------------------------------------------------------
