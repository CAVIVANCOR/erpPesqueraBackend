import AppError from './AppError.js';

export class ValidationError extends AppError {
  constructor(mensaje, detalles) {
    super({ mensaje, codigo: 'ERR_VALIDACION', status: 400, detalles });
  }
}

export class AuthError extends AppError {
  constructor(mensaje, detalles) {
    super({ mensaje, codigo: 'ERR_AUTENTICACION', status: 401, detalles });
  }
}

export class NotFoundError extends AppError {
  constructor(mensaje, detalles) {
    super({ mensaje, codigo: 'ERR_NO_ENCONTRADO', status: 404, detalles });
  }
}

export class ForbiddenError extends AppError {
  constructor(mensaje, detalles) {
    super({ mensaje, codigo: 'ERR_PROHIBIDO', status: 403, detalles });
  }
}

export class ConflictError extends AppError {
  constructor(mensaje, detalles) {
    super({ mensaje, codigo: 'ERR_CONFLICTO', status: 409, detalles });
  }
}

export class DatabaseError extends AppError {
  constructor(mensaje, detalles) {
    super({ mensaje, codigo: 'ERR_BD', status: 500, detalles });
  }
}
