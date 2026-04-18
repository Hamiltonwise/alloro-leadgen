/**
 * Adds retry_count to audit_processes.
 *
 * Public retry endpoint caps user-initiated retries at 3 per audit;
 * admin rerun bypasses the cap and does not increment this counter.
 *
 * File name on execution: 20260418000000_add_retry_count_to_audit_processes.js
 */

// TODO: fill during execution
exports.up = function (knex) {
  return knex.schema.alterTable("audit_processes", (table) => {
    table.integer("retry_count").notNullable().defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("audit_processes", (table) => {
    table.dropColumn("retry_count");
  });
};
