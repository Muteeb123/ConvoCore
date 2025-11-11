import { createRoot } from "react-dom/client";
import App from "./App";
import React from 'react';

import { BrowserRouter } from 'react-router-dom';
import "./index.css";

createRoot(document.getElementById("root")!).render(
<React.StrictMode>
    <BrowserRouter> {/* 2. Wrap your entire App component */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
