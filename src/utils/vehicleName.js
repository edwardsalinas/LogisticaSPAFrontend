/** «Marca Modelo» sin repetir la marca cuando el modelo ya la incluye (antes salía «Volvo Volvo FH16»). */
export const vehicleName = (v = {}) => {
  const brand = String(v.brand ?? '').trim();
  const model = String(v.model ?? '').trim();
  if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) return model;
  return [brand, model].filter(Boolean).join(' ');
};
