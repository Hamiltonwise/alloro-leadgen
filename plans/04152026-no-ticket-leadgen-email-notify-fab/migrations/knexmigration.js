/**
 * Knex migration scaffold — leadgen_email_notifications.
 * Filename on execute:
 *   src/database/migrations/20260417000000_create_leadgen_email_notifications.ts
 */

exports.up = async function up(knex) {
  await knex.schema.createTable("leadgen_email_notifications", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("session_id")
      .notNullable()
      .references("id")
      .inTable("leadgen_sessions")
      .onDelete("CASCADE");
    t.uuid("audit_id")
      .notNullable()
      .references("id")
      .inTable("audit_processes")
      .onDelete("CASCADE");
    t.text("email").notNullable();
    t.string("status", 16).notNullable().defaultTo("pending");
    t.integer("attempt_count").notNullable().defaultTo(0);
    t.text("last_error").nullable();
    t.timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    t.timestamp("sent_at", { useTz: true }).nullable();

    t.unique(["session_id", "audit_id"], "uniq_leadgen_email_notif_session_audit");
    t.index(["audit_id", "status"], "idx_leadgen_email_notif_audit_status");
    t.index(["status", "created_at"], "idx_leadgen_email_notif_status_created");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("leadgen_email_notifications");
};
