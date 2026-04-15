/**
 * Knex migration: ensure audit_processes table exists with strict schema.
 * Idempotent against existing n8n-created table.
 * Timestamp suffix to be assigned during execution.
 */

// TODO: fill during execution — rename file to follow backend migration naming
// (e.g. src/database/migrations/{yyyymmddhhmmss}_ensure_audit_processes.ts)

exports.up = async function (knex) {
  const exists = await knex.schema.hasTable("audit_processes");
  if (exists) {
    // TODO: fill during execution — if columns drifted in prod, alter here
    return;
  }

  await knex.schema.createTable("audit_processes", (table) => {
    table.string("id", 64).primary();
    table.text("domain").notNullable();
    table.text("practice_search_string").notNullable();
    table.string("status", 32).notNullable().defaultTo("pending");
    table.integer("realtime_status").notNullable().defaultTo(0);
    table.text("error_message").nullable();
    table.jsonb("step_screenshots").nullable();
    table.jsonb("step_website_analysis").nullable();
    table.jsonb("step_self_gbp").nullable();
    table.jsonb("step_competitors").nullable();
    table.jsonb("step_gbp_analysis").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("status", "idx_audit_processes_status");
    table.index(["created_at"], "idx_audit_processes_created_at");
  });
};

exports.down = async function (knex) {
  // Intentional no-op: do not drop a table that may pre-date this migration
  // and contain production audit history.
};
