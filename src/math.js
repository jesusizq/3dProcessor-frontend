import { mat3 } from "../node_modules/gl-matrix/esm/index.js";

export function createIdentity() {
  return mat3.create();
}

export function createTranslation(tx, ty) {
  const out = mat3.create();
  return mat3.fromTranslation(out, [tx, ty]);
}

export function createScaling(sx, sy) {
  const out = mat3.create();
  return mat3.fromScaling(out, [sx, sy]);
}

export function multiply(a, b) {
  const out = mat3.create();
  return mat3.multiply(out, a, b);
}
