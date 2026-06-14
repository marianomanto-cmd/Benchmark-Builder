// Brand-voice rules appended to every model prompt that generates user-facing
// copy (insights, analysis, wizard guidance). Keep additions short — they ride
// on each system prompt.
//
// RULE: never call the analyzed data "ruido"/"noise" — use "datos", "señales" or
// "conversación". "ruido" is allowed ONLY for what we discard as irrelevant or
// annoying (e.g. excluded topics).
export const NO_NOISE_RULE =
  " Regla de marca (obligatoria): NO uses la palabra «ruido» (ni «noise») para referirte a los datos, menciones o señales analizadas — usá «datos», «señales» o «conversación». Sólo se permite «ruido» para nombrar lo que se descarta por irrelevante o molesto.";
