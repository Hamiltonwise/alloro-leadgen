/**
 * Knex migrations: leadgen_sessions + leadgen_events.
 * Split into two files during execution, timestamp-prefixed per backend convention.
 *
 * TODO: fill during execution — split into:
 *   src/database/migrations/{ts}_create_leadgen_sessions.ts
 *   src/database/migrations/{ts}_create_leadgen_events.ts
 *   (separate files so they can be rolled back independently)
 */

exports.up = async function (knex) {
  await knex.schema.createTable("leadgen_sessions", (table) => {
    table.uuid("id").primary();
    table.string("audit_id", 64).nullable();
    table.text("email").nullable();
    table.text("domain").nullable();
    table.text("practice_search_string").nullable();
    table.text("referrer").nullable();
    table.text("utm_source").nullable();
    table.text("utm_medium").nullable();
    table.text("utm_campaign").nullable();
    table.text("utm_term").nullable();
    table.text("utm_content").nullable();
    table.string("final_stage", 48).notNullable().defaultTo("landed");
    table.boolean("completed").notNullable().defaultTo(false);
    table.boolean("abandoned").notNullable().defaultTo(false);
    table.timestamp("first_seen_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("last_seen_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.foreign("audit_id").references("audit_processes.id").onDelete("SET NULL");
    table.index("audit_id", "idx_leadgen_sessions_audit_id");
    table.index("email", "idx_leadgen_sessions_email");
    table.index(["created_at"], "idx_leadgen_sessions_created_at");
    table.index("final_stage", "idx_leadgen_sessions_final_stage");
  });

  await knex.schema.createTable("leadgen_events", (table) => {
    table.uuid("id").primary();
    table.uuid("session_id").notNullable();
    table.string("event_name", 48).notNullable();
    table.jsonb("event_data").nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign("session_id")
      .references("leadgen_sessions.id")
      .onDelete("CASCADE");
    table.index("session_id", "idx_leadgen_events_session_id");
    table.index(["session_id", "created_at"], "idx_leadgen_events_session_id_created");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("leadgen_events");
  await knex.schema.dropTableIfExists("leadgen_sessions");
};
