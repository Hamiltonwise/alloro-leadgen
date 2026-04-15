/**
 * Knex migration — leadgen tracking overhaul.
 * Adds conversion + user-link + parsed UA columns to leadgen_sessions,
 * plus a supporting index on leadgen_events for the cumulative-funnel rewrite.
 *
 * Target filename on execution:
 *   src/database/migrations/20260416000000_leadgen_tracking_overhaul.ts
 * (TS file — the .js here is the CLAUDE.md-required scaffold; convert on execute.)
 */

exports.up = async function up(knex) {
  await knex.schema.alterTable("leadgen_sessions", (t) => {
    t.timestamp("converted_at", { useTz: true }).nullable();
    t.integer("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    t.text("browser").nullable();
    t.text("os").nullable();
    t.text("device_type").nullable();

    t.index(["user_id"], "idx_leadgen_sessions_user_id");
  });

  // Partial index on converted_at — only indexes rows that actually converted,
  // so the index stays tiny and hot for stats queries.
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_leadgen_sessions_converted
       ON leadgen_sessions (converted_at)
       WHERE converted_at IS NOT NULL`
  );

  // Supporting index for T1 cumulative-funnel query (session_id, event_name).
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_leadgen_events_session_event
       ON leadgen_events (session_id, event_name)`
  );

  // TODO: fill during execution — backfill browser/os/device_type for rows
  // that already have user_agent populated.
};

exports.down = async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS idx_leadgen_events_session_event`);
  await knex.raw(`DROP INDEX IF EXISTS idx_leadgen_sessions_converted`);

  await knex.schema.alterTable("leadgen_sessions", (t) => {
    t.dropIndex(["user_id"], "idx_leadgen_sessions_user_id");
    t.dropColumn("device_type");
    t.dropColumn("os");
    t.dropColumn("browser");
    t.dropForeign(["user_id"]);
    t.dropColumn("user_id");
    t.dropColumn("converted_at");
  });
};
