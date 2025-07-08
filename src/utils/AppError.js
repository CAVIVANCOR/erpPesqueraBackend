export default class AppError extends Error {
  constructor({ mensaje, codigo = 'ERR_INTERNO', status = 500, detalles }) {
    super(mensaje);
    this.codigo = codigo;
    this.status = status;
    this.detalles = detalles;
  }
}
