import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("[SharkPay] Aplicativo iniciando...");
createRoot(document.getElementById("root")!).render(<App />);
