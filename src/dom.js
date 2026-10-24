export function F(sel, root = document) {
  return root.querySelector(sel);
}

export function FF(sel, root = document) {
  return root.querySelectorAll(sel);
}
