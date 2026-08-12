// SOMA Nutrition Implementation Brief Part B, item 4: deterministic
// validation for one logged meal - same split as structured.js/
// jobApplication.js, code enforces the shape/plausibility, no AI judgment
// involved for the search-based path (the photo-based path in
// server/index.js runs an AI vision call first, but its OUTPUT still passes
// through this exact same validator before it's trusted as evidence -
// defense in depth, same principle as jobMatch.cleanJobMatchResult).

const MEAL_TYPES = ["sarapan", "makan_siang", "makan_malam", "camilan"];
const MEAL_TYPE_LABEL = { sarapan: "Sarapan", makan_siang: "Makan Siang", makan_malam: "Makan Malam", camilan: "Camilan" };

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Plausibility caps - catches fabrication-grade/garbled numbers (same
// "generous, not policing outliers" spirit as structured.js's speed caps),
// not a strict nutrition-science bound.
const MAX_CALORIES = 5000;
const MAX_MACRO_GRAMS = 500;

function validateFoodEntry(data) {
  if (!data || typeof data !== "object") return { ok: false, error: "Data makanan kosong." };

  const foodName = String(data.foodName || "").trim();
  const servingAmount = num(data.servingAmount);
  const servingUnit = String(data.servingUnit || "").trim();
  const calories = num(data.calories);
  const protein = num(data.protein);
  const carbohydrates = num(data.carbohydrates);
  const fat = num(data.fat);
  const mealType = data.mealType;

  if (!foodName) return { ok: false, error: "Nama makanan wajib diisi." };
  if (foodName.length > 200) return { ok: false, error: "Nama makanan terlalu panjang." };
  if (!MEAL_TYPES.includes(mealType)) return { ok: false, error: "Pilih waktu makan: Sarapan, Makan Siang, Makan Malam, atau Camilan." };
  if (servingAmount == null || servingAmount <= 0 || servingAmount > 10000) return { ok: false, error: "Jumlah porsi tidak wajar — cek lagi angkanya." };
  if (!servingUnit) return { ok: false, error: "Satuan porsi wajib diisi (mis. gram, porsi, gelas)." };
  if (calories == null || calories < 0 || calories > MAX_CALORIES) return { ok: false, error: "Kalori di luar rentang wajar — cek lagi angkanya." };
  if (protein == null || protein < 0 || protein > MAX_MACRO_GRAMS) return { ok: false, error: "Protein di luar rentang wajar — cek lagi angkanya." };
  if (carbohydrates == null || carbohydrates < 0 || carbohydrates > MAX_MACRO_GRAMS) return { ok: false, error: "Karbohidrat di luar rentang wajar — cek lagi angkanya." };
  if (fat == null || fat < 0 || fat > MAX_MACRO_GRAMS) return { ok: false, error: "Lemak di luar rentang wajar — cek lagi angkanya." };

  return {
    ok: true,
    clean: {
      foodName: foodName.slice(0, 200), servingAmount, servingUnit: servingUnit.slice(0, 40),
      calories, protein, carbohydrates, fat, mealType,
    },
  };
}

module.exports = { MEAL_TYPES, MEAL_TYPE_LABEL, validateFoodEntry };
