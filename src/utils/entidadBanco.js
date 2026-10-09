/**
 * Entidad comercial (tercero) que representa a un banco: Banco.enlaceEntidadComercialId.
 *
 * Se usa para llenar MovimientoCaja.entidadComercialId (y el tercero de las líneas de asiento)
 * en operaciones donde la contraparte es un banco: préstamos, transferencias internas y
 * ITF/comisiones de pagos de deudas.
 *
 * Devuelve null cuando el banco no tiene enlace (p. ej. "S/B" o billeteras digitales) o no se
 * cargó: en ese caso la operación continúa normalmente, sin tercero.
 *
 * @param {{ enlaceEntidadComercialId?: bigint|number|null }|null|undefined} banco
 * @returns {number|null}
 */
export const entidadDeBanco = (banco) => {
  const id = banco?.enlaceEntidadComercialId;
  return id === null || id === undefined ? null : Number(id);
};
