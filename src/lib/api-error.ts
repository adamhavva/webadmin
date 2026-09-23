export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Data tidak ditemukan") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details?: unknown) {
    return new ApiError(409, "CONFLICT", message, details);
  }

  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, "UNPROCESSABLE_ENTITY", message, details);
  }

  static internal(message = "Terjadi kesalahan pada server") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}