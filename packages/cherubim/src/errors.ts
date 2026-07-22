export class ForbiddenError extends Error {
  readonly status = 403;
  readonly code = 'E_FORBIDDEN';

  constructor(message = 'This action is unauthorized.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  readonly code = 'E_UNAUTHORIZED';

  constructor(message = 'Authentication required.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
