import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

export class LambdaURLStack extends cdk.Stack {
   public readonly lambdaFunc;

   constructor(scope: Construct, id: string, props?: StackProps) {
      super(scope, id, props);

      // Lambda function
      this.lambdaFunc = new lambda.Function(this, "MyFunction", {
         runtime: lambda.Runtime.NODEJS_22_X,
         handler: "index.handler",
         code: lambda.Code.fromInline(`
exports.handler = async (event) => {
   return "CORS works!"
};
`),
      });

      // Enable Function URL with IAM auth
      const fnUrl = this.lambdaFunc.addFunctionUrl({
         authType: lambda.FunctionUrlAuthType.AWS_IAM,
         cors: {
            allowedOrigins: ["*"],
            allowedMethods: [lambda.HttpMethod.ALL],
            allowedHeaders: [
               "x-amz-security-token",
               "Authorization",
               "Content-Type",
               "X-Amz-Date",
               "x-amz-content-sha256",
            ],
            allowCredentials: true,
         },
      });

      new cdk.CfnOutput(this, "FunctionUrl", {
         value: fnUrl.url,
      });
   }
}
