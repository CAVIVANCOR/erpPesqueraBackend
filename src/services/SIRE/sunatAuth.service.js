import { ValidationError } from '../../utils/errors.js';

let tokenCache = null;
let tokenExpiry = null;

async function obtenerTokenSIRE(empresa) {
  if (!empresa.sunatClientId || !empresa.sunatClientSecret || !empresa.sunatUsuarioSol || !empresa.sunatClaveSol) {
    throw new ValidationError('Credenciales SUNAT SIRE incompletas en la empresa');
  }

  if (tokenCache && tokenExpiry && Date.now() < tokenExpiry) {
    return tokenCache;
  }

  const url = `https://api-seguridad.sunat.gob.pe/v1/clientessol/${empresa.sunatClientId}/oauth2/token/`;
  
  const username = `${empresa.ruc}${empresa.sunatUsuarioSol}`;
  
  const body = new URLSearchParams({
    grant_type: 'password',
    scope: 'https://api-sire.sunat.gob.pe',
    client_id: empresa.sunatClientId,
    client_secret: empresa.sunatClientSecret,
    username: username,
    password: empresa.sunatClaveSol
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ValidationError(`Error OAuth SUNAT (${response.status}): ${error}`);
  }

  const data = await response.json();
  tokenCache = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  
  return tokenCache;
}

export default {
  obtenerTokenSIRE
};