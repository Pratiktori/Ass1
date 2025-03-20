import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerEvent,
  PolicyDocument,
  APIGatewayProxyEvent,
  StatementEffect,
} from "aws-lambda";
import axios from "axios";
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwkToPem, { RSA } from "jwk-to-pem";

export type CookieMap = { [key: string]: string } | undefined;
export type JwtToken = { sub: string; email: string } | null;
export type Jwk = {
  keys: {
    alg: string;
    e: string;
    kid: string;
    kty: "RSA";
    n: string;
    use: string;
  }[];
};
export const parseCookies = (
  event: APIGatewayRequestAuthorizerEvent | APIGatewayProxyEvent
) => {
  if (!event.headers || !event.headers.Cookie) {
    return undefined;
  }
  const cookiesStr = event.headers.Cookie;
  const cookiesArr = cookiesStr.split(";");
  const cookieMap: CookieMap = {};
  for (let cookie of cookiesArr) {
    const cookieSplit = cookie.trim().split("=");
    cookieMap[cookieSplit[0]] = cookieSplit[1];
  }
  return cookieMap;
};
export const verifyToken = async (
  token: string,
  userPoolId: string | undefined,
  region: string
): Promise<JwtToken> => {
  try {
    const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const { data }: { data: Jwk } = await axios.get(url);
    // Extract the kid from the JWT token
    const decodedJwt = jwt.decode(token, { complete: true }) as { header: { kid: string } } | null;
    if (!decodedJwt?.header?.kid) {
      console.log("No kid found in JWT header");
      return null;
    }
    const kid = decodedJwt.header.kid;
    // Find the matching JWK
    const matchingKey = data.keys.find((key) => key.kid === kid);
    if (!matchingKey) {
      console.log("No matching key found for kid", kid);
      return null;
    }
    const pem = jwkToPem(matchingKey);
    // Verify the JWT
    const verifiedJwt = jwt.verify(token, pem, { algorithms: ["RS256"] }) as JwtPayload;
    // Check if sub and email are present in the verified JWT payload
    if (!verifiedJwt.sub || !verifiedJwt.email) {
      console.log("sub or email not found in verified JWT payload");
      return null;
    }
    // Return the JWT payload
    return {
      sub: verifiedJwt.sub,
      email: verifiedJwt.email,
    };
  } catch (err) {
    console.log("Token verification error", err);
    return null;
  }
};
export const createPolicy = (
  event: APIGatewayAuthorizerEvent,
  effect: StatementEffect
): PolicyDocument => {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: effect,
        Action: "execute-api:Invoke",
        Resource: [event.methodArn],
      },
    ],
  };
};
