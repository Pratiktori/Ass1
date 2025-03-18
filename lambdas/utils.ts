import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerEvent, PolicyDocument, APIGatewayProxyEvent, StatementEffect } from "aws-lambda";
import axios from "axios";
import jwt from 'jsonwebtoken';
import jwkToPem from "jwk-to-pem";

export type CookieMap = { [key: string]: string } | undefined;
export type JwtToken = { sub: string; email: string } | null;
export type Jwk = { keys: { alg: string; e: string; kid: string; kty: string; n: string; use: string; }[] };

interface RSA_JWK {
  alg: string;
  e: string;
  kid: string;
  kty: 'RSA';
  n: string;
  use: string;
}

export const parseCookies = (event: APIGatewayRequestAuthorizerEvent | APIGatewayProxyEvent) => {
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

function isJwtToken(token: string | jwt.JwtPayload | null): token is JwtToken {
  return token !== null && typeof token === 'object' && 'sub' in token && 'email' in token;
}

export const verifyToken = async (token: string, userPoolId: string | undefined, region: string): Promise<JwtToken> => {
  try {
    const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const { data }: { data: Jwk } = await axios.get(url);
    const rsaKey = data.keys.find(key => key.kty === 'RSA');
    if (!rsaKey) {
      console.error('No RSA key found in JWK set.');
      return null;
    }
    const pem = jwkToPem(rsaKey as RSA_JWK);
    const verifiedToken = jwt.verify(token, pem, { algorithms: ["RS256"] });
    if (isJwtToken(verifiedToken)) {
      return verifiedToken;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

export const createPolicy = (event: APIGatewayAuthorizerEvent, effect: StatementEffect): PolicyDocument => {
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
