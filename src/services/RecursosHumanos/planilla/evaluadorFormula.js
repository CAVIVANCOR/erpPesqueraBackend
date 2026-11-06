/**
 * Evaluador seguro de fórmulas de conceptos de planilla (sin eval ni Function).
 *
 * Sintaxis: números, variables (sin distinguir mayúsculas), + - * / %, paréntesis, comparaciones
 * (= == <> != < > <= >=), AND, OR, NOT y las funciones MIN, MAX, ROUND(x, n), ABS, FLOOR, CEIL e IF(condición, a, b).
 * Los sí/no se manejan como 1 y 0. Cualquier error indica qué falló (variable inexistente, división por cero, etc.).
 */

const FUNCIONES = {
  MIN: (...args) => Math.min(...args),
  MAX: (...args) => Math.max(...args),
  ROUND: (valor, decimales = 0) => {
    const factor = 10 ** decimales;
    return Math.round((valor + Number.EPSILON) * factor) / factor;
  },
  ABS: (valor) => Math.abs(valor),
  FLOOR: (valor) => Math.floor(valor),
  CEIL: (valor) => Math.ceil(valor),
};

function tokenizar(texto) {
  const tokens = [];
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^\d*\.?\d+/.exec(texto.slice(i));
      if (!m) throw new Error(`Número inválido cerca de "${texto.slice(i, i + 8)}"`);
      tokens.push({ tipo: 'num', valor: Number(m[0]) });
      i += m[0].length;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(texto.slice(i));
      tokens.push({ tipo: 'id', valor: m[0].toUpperCase() });
      i += m[0].length;
    } else {
      const dos = texto.slice(i, i + 2);
      if (['<=', '>=', '<>', '!=', '=='].includes(dos)) {
        tokens.push({ tipo: 'op', valor: dos });
        i += 2;
      } else if ('+-*/%()<>=,'.includes(c)) {
        tokens.push({ tipo: 'op', valor: c });
        i++;
      } else {
        throw new Error(`Carácter no permitido "${c}" en la fórmula`);
      }
    }
  }
  return tokens;
}

/** Convierte los tokens en un árbol de evaluación (funciones que reciben las variables). */
function construir(tokens) {
  let pos = 0;
  const actual = () => tokens[pos];
  const esOp = (valor) => actual()?.tipo === 'op' && actual().valor === valor;
  const esPalabra = (palabra) => actual()?.tipo === 'id' && actual().valor === palabra;
  const exigirOp = (valor) => {
    if (!esOp(valor)) throw new Error(`Se esperaba "${valor}" en la fórmula`);
    pos++;
  };

  const o = () => {
    let izq = y();
    while (esPalabra('OR')) {
      pos++;
      const a = izq;
      const b = y();
      izq = (v) => (a(v) || b(v) ? 1 : 0);
    }
    return izq;
  };
  const y = () => {
    let izq = no();
    while (esPalabra('AND')) {
      pos++;
      const a = izq;
      const b = no();
      izq = (v) => (a(v) && b(v) ? 1 : 0);
    }
    return izq;
  };
  const no = () => {
    if (esPalabra('NOT')) {
      pos++;
      const a = no();
      return (v) => (a(v) ? 0 : 1);
    }
    return comparacion();
  };
  const comparacion = () => {
    const izq = suma();
    const t = actual();
    if (t?.tipo === 'op' && ['=', '==', '<>', '!=', '<', '>', '<=', '>='].includes(t.valor)) {
      pos++;
      const der = suma();
      const comparar = {
        '=': (a, b) => a === b, '==': (a, b) => a === b, '<>': (a, b) => a !== b, '!=': (a, b) => a !== b,
        '<': (a, b) => a < b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '>=': (a, b) => a >= b,
      }[t.valor];
      return (v) => (comparar(izq(v), der(v)) ? 1 : 0);
    }
    return izq;
  };
  const suma = () => {
    let izq = producto();
    while (esOp('+') || esOp('-')) {
      const op = actual().valor;
      pos++;
      const a = izq;
      const b = producto();
      izq = op === '+' ? (v) => a(v) + b(v) : (v) => a(v) - b(v);
    }
    return izq;
  };
  const producto = () => {
    let izq = unario();
    while (esOp('*') || esOp('/') || esOp('%')) {
      const op = actual().valor;
      pos++;
      const a = izq;
      const b = unario();
      izq = (v) => {
        const x = a(v);
        const z = b(v);
        if (op === '*') return x * z;
        if (z === 0) throw new Error('División por cero');
        return op === '/' ? x / z : x % z;
      };
    }
    return izq;
  };
  const unario = () => {
    if (esOp('-')) {
      pos++;
      const a = unario();
      return (v) => -a(v);
    }
    if (esOp('+')) {
      pos++;
      return unario();
    }
    return primario();
  };
  const primario = () => {
    const t = actual();
    if (!t) throw new Error('La fórmula termina antes de tiempo');
    if (t.tipo === 'num') {
      pos++;
      return () => t.valor;
    }
    if (esOp('(')) {
      pos++;
      const interior = o();
      exigirOp(')');
      return interior;
    }
    if (t.tipo === 'id') {
      pos++;
      if (esOp('(')) {
        pos++;
        const args = [];
        if (!esOp(')')) {
          args.push(o());
          while (esOp(',')) {
            pos++;
            args.push(o());
          }
        }
        exigirOp(')');
        if (t.valor === 'IF') {
          if (args.length !== 3) throw new Error('IF necesita 3 argumentos: IF(condición, valor_si, valor_no)');
          return (v) => (args[0](v) ? args[1](v) : args[2](v));
        }
        const funcion = FUNCIONES[t.valor];
        if (!funcion) throw new Error(`La función "${t.valor}" no existe (use MIN, MAX, ROUND, ABS, FLOOR, CEIL o IF)`);
        return (v) => funcion(...args.map((a) => a(v)));
      }
      return (v) => {
        if (!(t.valor in v)) throw new Error(`La variable "${t.valor}" no existe o no tiene valor vigente`);
        return Number(v[t.valor]);
      };
    }
    throw new Error(`Símbolo inesperado "${t.valor}" en la fórmula`);
  };

  const arbol = o();
  if (pos < tokens.length) throw new Error(`Sobra texto en la fórmula desde "${tokens[pos].valor}"`);
  return arbol;
}

/**
 * Evalúa una fórmula con las variables dadas.
 * @param {string} formula
 * @param {Object<string, number>} variables - Claves en mayúsculas
 * @returns {number}
 */
export function evaluarFormula(formula, variables) {
  const resultado = construir(tokenizar(String(formula)))(variables);
  if (!Number.isFinite(resultado)) throw new Error('La fórmula no produce un número válido');
  return resultado;
}
