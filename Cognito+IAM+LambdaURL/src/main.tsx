import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
   authority: import.meta.env.VITE_COGNITO_AUTHORITY,
   client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
   redirect_uri: "http://localhost:5173/",
   response_type: "code",
   scope: "phone openid email",
};

const rootElement = document.getElementById("root");
if (!rootElement) {
   throw new Error('Root element with id "root" not found');
}
const root = ReactDOM.createRoot(rootElement);

root.render(
   <React.StrictMode>
      <AuthProvider {...cognitoAuthConfig}>
         <App />
      </AuthProvider>
   </React.StrictMode>
);
