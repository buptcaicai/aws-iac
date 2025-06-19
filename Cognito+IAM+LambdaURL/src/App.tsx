import { useAuth } from "react-oidc-context";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
const region = "ap-southeast-2";
const identityPoolId = import.meta.env.VITE_IDENTITY_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;

async function callLambdaWithSigV4(idToken: string) {

   // Step 1: Get AWS credentials from Identity Pool
   const credentialsProvider = fromCognitoIdentityPool({
      clientConfig: { region },
      identityPoolId,
      logins: {
         [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken,
      },
   });

   const credentials = await credentialsProvider();

   // Step 2: Prepare and sign the request
   const hostname = new URL(lambdaUrl).hostname;

   const request = new HttpRequest({
      method: "GET",
      protocol: "https:",
      hostname,
      path: "/",
      headers: {
         host: hostname,
      },
   });

   const signer = new SignatureV4({
      service: "lambda",
      region,
      credentials,
      sha256: Sha256,
   });

   const signed = await signer.sign(request);

   // Step 3: Send request
   const response = await fetch(lambdaUrl, {
      method: signed.method,
      headers: signed.headers,
   });

   const result = await response.text();
   console.log("Lambda Response:", result);
}

async function verifyJWT(token: string) {
   try {
      const verifier = CognitoJwtVerifier.create({
         userPoolId,
         tokenUse: "access",
         clientId,
      });
      //@ts-ignore
      const payload = await verifier.verify(token);
      console.log("Decoded JWT:", payload);
   } catch (err) {
      console.error("Error verifying JWT:", err);
   }
}

function App() {
   const auth = useAuth();

   const signOutRedirect = () => {
      const logoutUri = "http://localhost:5173/";
      window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
         logoutUri
      )}`;
   };

   if (auth.isLoading) {
      return <div>Loading...</div>;
   }

   if (auth.error) {
      return <div>Encountering error... {auth.error.message}</div>;
   }

   if (auth.isAuthenticated) {
      if (auth.user?.access_token) {
         verifyJWT(auth.user.access_token);
      }

      callLambdaWithSigV4(auth.user!.id_token!);

      // fetch(lambdaUrl).then(async (response) => {
      //    if (!response.ok) {
      //       throw new Error(`HTTP error! status: ${response.status}`);
      //    }
      //    console.log("resopnse.text(): ", await response.text());
      // });

      return (
         <div>
            <pre> Hello: {auth.user?.profile.email} </pre>
            <pre> ID Token: {auth.user?.id_token} </pre>
            <pre> Access Token: {auth.user?.access_token} </pre>
            <pre> Refresh Token: {auth.user?.refresh_token} </pre>

            <button onClick={() => auth.removeUser()}>Sign out</button>
         </div>
      );
   }

   return (
      <div>
         <button onClick={() => auth.signinRedirect()}>Sign in</button>
         <button onClick={() => signOutRedirect()}>Sign out</button>
      </div>
   );
}

export default App;
