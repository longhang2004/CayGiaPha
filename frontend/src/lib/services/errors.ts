export type ErrorCode =
  | "VALIDATION_ERROR"
  | "IDENTIFIER_TAKEN"
  | "ACCOUNT_NOT_FOUND"
  | "CODE_INVALID"
  | "CODE_EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "NOT_AUTHORIZED"
  | "NODE_NOT_ACCESSIBLE"
  | "MISSING_NODE"
  | "SELF_REFERENCE"
  | "CYCLE_VIOLATION"
  | "PARENT_LIMIT"
  | "ALREADY_CLAIMED"
  | "CONSENT_REQUIRED"
  | "INTERNAL_ERROR";

export const ErrorHttpStatus: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  IDENTIFIER_TAKEN: 409,
  ACCOUNT_NOT_FOUND: 401,
  CODE_INVALID: 401,
  CODE_EXPIRED: 401,
  TOO_MANY_ATTEMPTS: 429,
  NOT_AUTHORIZED: 403,
  NODE_NOT_ACCESSIBLE: 404,
  MISSING_NODE: 404,
  SELF_REFERENCE: 409,
  CYCLE_VIOLATION: 409,
  PARENT_LIMIT: 409,
  ALREADY_CLAIMED: 409,
  CONSENT_REQUIRED: 403,
  INTERNAL_ERROR: 500,
};

export class ApiException extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ApiException";
  }

  static validation(field: string, message: string) {
    return new ApiException("VALIDATION_ERROR", message, field);
  }

  static identifierTaken(field: string, message: string) {
    return new ApiException("IDENTIFIER_TAKEN", message, field);
  }

  static accountNotFound(message: string) {
    return new ApiException("ACCOUNT_NOT_FOUND", message);
  }

  static codeInvalid(message: string) {
    return new ApiException("CODE_INVALID", message);
  }

  static codeExpired(message: string) {
    return new ApiException("CODE_EXPIRED", message);
  }

  static tooManyAttempts(message: string) {
    return new ApiException("TOO_MANY_ATTEMPTS", message);
  }

  static notAuthorized(message: string) {
    return new ApiException("NOT_AUTHORIZED", message);
  }

  static nodeNotAccessible(message: string) {
    return new ApiException("NODE_NOT_ACCESSIBLE", message);
  }

  static missingNode(field: string, message: string) {
    return new ApiException("MISSING_NODE", message, field);
  }

  static selfReference(message: string) {
    return new ApiException("SELF_REFERENCE", message);
  }

  static cycleViolation(message: string) {
    return new ApiException("CYCLE_VIOLATION", message);
  }

  static parentLimit(message: string) {
    return new ApiException("PARENT_LIMIT", message);
  }

  static alreadyClaimed(message: string) {
    return new ApiException("ALREADY_CLAIMED", message);
  }

  static consentRequired(message: string) {
    return new ApiException("CONSENT_REQUIRED", message);
  }

  static internal(message: string) {
    return new ApiException("INTERNAL_ERROR", message);
  }

  toResponse() {
    const status = ErrorHttpStatus[this.code] || 500;
    return Response.json(
      {
        error: {
          code: this.code,
          field: this.field,
          message: this.message,
        },
      },
      { status }
    );
  }
}
