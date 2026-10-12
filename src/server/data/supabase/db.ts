import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { AccessDeniedError, ConflictError, NotFoundError } from "@/server/data/repository";

/**
 * Result handling for PostgREST calls. Raw database errors never leave this
 * module: they become domain errors (AccessDenied / NotFound / Conflict) or a
 * generic Error. Only the error code is logged — messages can echo values
 * (e.g. an email in a unique-violation detail), so they are never logged.
 */

interface Result {
  data: unknown;
  error: PostgrestError | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids come from URLs; a malformed one is simply "not found", not a DB error. */
export function assertUuid(id: string): void {
  if (!UUID.test(id)) throw new NotFoundError();
}

function conflictField(error: PostgrestError): string {
  return /nfc_cards_code_key/.test(error.message) ? "code" : "slug";
}

export function toDomainError(error: PostgrestError, context: string): Error {
  switch (error.code) {
    case "23505": // unique_violation
      return new ConflictError(conflictField(error));
    case "42501": // insufficient_privilege, incl. RLS "new row violates row-level security policy"
      return new AccessDeniedError();
    case "PGRST116": // .single() matched no rows (missing, or hidden by RLS)
    case "P0002": // no_data_found raised by an RPC
    case "23503": // foreign key: referenced row missing / belongs to another business
      return new NotFoundError();
    case "22023": // invalid_parameter_value raised by an RPC
    case "22P02": // invalid_text_representation (bad uuid/enum)
    case "23502": // not_null_violation
    case "23514": // check_violation
      return new Error("Invalid input");
    case "P0001": // business rule refused by an RPC (e.g. last admin, business limit)
      return new Error("Operation not allowed");
    default:
      console.error(`[db] ${context} failed`, { code: error.code });
      return new Error("Database error");
  }
}

export function check(result: { error: PostgrestError | null }, context: string): void {
  if (result.error) throw toDomainError(result.error, context);
}

export function list<T>(result: Result, context: string): T[] {
  if (result.error) throw toDomainError(result.error, context);
  return (result.data ?? []) as T[];
}

export function maybe<T>(result: Result, context: string): T | null {
  if (result.error) throw toDomainError(result.error, context);
  return (result.data ?? null) as T | null;
}

export function single<T>(result: Result, context: string): T {
  const row = maybe<T>(result, context);
  if (row === null) throw new NotFoundError();
  return row;
}
