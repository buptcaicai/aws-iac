#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LambdaURLStack } from "../lib/lambda-url-stack";
import { CognitoStack } from "../lib/cognito-stack";

const app = new cdk.App();
const lambdaUrlStack = new LambdaURLStack(app, "Hello-Cognito-Lambda-URL");
const cognitoStack = new CognitoStack(app, "CognitoStack", {
   lambdaFunc: lambdaUrlStack.lambdaFunc,
});
