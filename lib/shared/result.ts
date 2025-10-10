// Simple Result helper (optionnel pour futures évolutions)
export type Ok<T> = { ok: true; value: T };
export type Fail<E = Error> = { ok: false; error: E };
export type Result<T, E = Error> = Ok<T> | Fail<E>;

export const Result = {
  ok<T>(value: T): Ok<T> { return { ok: true, value }; },
  fail<E>(error: E): Fail<E> { return { ok: false, error }; },
  isOk<T, E>(r: Result<T, E>): r is Ok<T> { return r.ok; },
  isFail<T, E>(r: Result<T, E>): r is Fail<E> { return !r.ok; }
};
