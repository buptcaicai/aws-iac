import { aws_lambda, CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";

interface CognitoStackProps extends StackProps {
   lambdaFunc: aws_lambda.Function;
}

export class CognitoStack extends Stack {
   constructor(scope: Construct, id: string, props: CognitoStackProps) {
      super(scope, id, props);

      // Create User Pool
      const userPool = new cognito.UserPool(this, "UserPool", {
         selfSignUpEnabled: true,
         signInAliases: { email: true },
         autoVerify: { email: true },
      });

      // Create User Pool Client
      const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
         userPool,
         generateSecret: false,
         oAuth: {
            flows: {
               authorizationCodeGrant: true,
            },
            scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PHONE],
            callbackUrls: ["http://localhost:5173/"],
            logoutUrls: ["http://localhost:5173/"],
         },
      });

      // Create Identity Pool
      const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
         allowUnauthenticatedIdentities: false,
         cognitoIdentityProviders: [
            {
               clientId: userPoolClient.userPoolClientId,
               providerName: userPool.userPoolProviderName,
            },
         ],
      });

      // Optional: IAM role that can invoke the function
      const callerRole = new iam.Role(this, "CognitoLambdaRole", {
         assumedBy: new iam.FederatedPrincipal(
            "cognito-identity.amazonaws.com",
            {
               StringEquals: {
                  "cognito-identity.amazonaws.com:aud": identityPool.ref,
               },
               "ForAnyValue:StringLike": {
                  "cognito-identity.amazonaws.com:amr": "authenticated",
               },
            },
            "sts:AssumeRoleWithWebIdentity"
         ),
      });

      props.lambdaFunc.grantInvokeUrl(callerRole);

      // IAM roles for authenticated users
      // Attach roles to Identity Pool
      new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoleAttachment", {
         identityPoolId: identityPool.ref,
         roles: {
            authenticated: callerRole.roleArn,
         },
      });

      // add managed page style
      const domain = userPool.addDomain("CognitoDomain", {
         cognitoDomain: {
            domainPrefix: "weimin-test", // Use your preferred domain prefix
         },
      });

      new cognito.CfnManagedLoginBranding(this, "CognitoManagedLoginBranding", {
         clientId: userPoolClient.userPoolClientId,
         userPoolId: userPool.userPoolId,
         useCognitoProvidedValues: true,
      });

      // Add outputs
      new CfnOutput(this, "UserPoolId", {
         value: userPool.userPoolId,
      });

      new CfnOutput(this, "ClientId", {
         value: userPoolClient.userPoolClientId,
      });

      new CfnOutput(this, "CognitoAuthority", {
         value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      });
      
      new CfnOutput(this, "IdentityPoolId", {
         value: identityPool.ref,
      });

      new CfnOutput(this, "CognitoDomain", {
         value: domain.baseUrl(),
      });
   }
}
