export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST', details?: unknown) => new AppError(400, code, message, details)
export const unauthorized = (message = 'Please log in to continue', code = 'UNAUTHORIZED') => new AppError(401, code, message)
export const forbidden = (message = 'You do not have access to this resource', code = 'FORBIDDEN') => new AppError(403, code, message)
export const notFound = (message = 'Not found', code = 'NOT_FOUND') => new AppError(404, code, message)
export const conflict = (message: string, code = 'CONFLICT') => new AppError(409, code, message)
