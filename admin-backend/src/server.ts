import { getEnv } from "./config/env.js";
import { app } from "./app.js";

const env = getEnv();

app.listen(env.PORT, () => {
  console.log(`Admin backend running on http://localhost:${env.PORT}`);
});
