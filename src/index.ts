import "reflect-metadata";
import dotenv from "dotenv";
import path from "path";
dotenv.config();
import { createLogger, writeLog } from "fast-node-logger";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import type { NodeMode } from "./typings/node/mode";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import expressPinoLogger from "express-pino-logger";
import {
  BearerStrategy,
  IBearerStrategyOptionWithRequest,
} from "passport-azure-ad";
import passport from "passport";
import { schemaGenerator } from "./graphql/schema-generator";

/** server mode base on process.env.NODE_ENV */
let nodeMode: NodeMode = process.env.NODE_ENV || "production";

if (process.env.NODE_ENV) {
  nodeMode = process.env.NODE_ENV;
}

const serverPort = parseInt(process.env.PORT || "4001");

const gqlUrlPath = "/graphql";

async function main() {
  /** ready to use instance of logger */
  const logger = await createLogger({
    level: nodeMode === "development" ? "trace" : "warn",
    prettyPrint: { colorize: true, translateTime: " yyyy-mm-dd HH:MM:ss" },
    logDir: path.join(process.cwd(), "logs"),
  });
  writeLog(`script started in ${nodeMode} mode!`, { stdout: true });

  const app = express();

  app.use(expressPinoLogger({ logger }));

  /**@step helmet for http security headers */
  const helmetOptions: Parameters<typeof helmet>[0] = {
    contentSecurityPolicy: nodeMode === "development" ? false : undefined,
  };
  app.use(helmet(helmetOptions));

  /**@step cors config*/
  /**cors white list */
  const corsWhitelist = [/** Client URL on Production */ "https://DOMAIN.com"];

  if (nodeMode === "development") {
    corsWhitelist.push(
      `http://localhost:3000` /** Client URL on development */,
      `http://localhost:${serverPort}` /** Playground */,
    );
  }
  const corsOptions: CorsOptions = {
    origin: function (origin, callback) {
      if (origin === undefined) {
        callback(null, true);
      } else if (origin && corsWhitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        writeLog(`Not allowed by CORS for ${origin}`);
        callback(new Error(`Not allowed by CORS for ${origin}`), false);
      }
    },
    methods: "POST",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  app.use(cors(corsOptions));

  /**@step authentication setup to check the azure AD token */
  const azureAdTokenOptions: IBearerStrategyOptionWithRequest = {
    identityMetadata: process.env.IDENTITY_METADATA ?? "",
    clientID: process.env.CLIENT_ID ?? "",
    validateIssuer: true,
    issuer: process.env.ISSUER,
    passReqToCallback: true,
    isB2C: false,
    allowMultiAudiencesInToken: false,
    audience: process.env.CLIENT_ID ?? "",
    loggingLevel: `warn`,
    loggingNoPII: false,
    clockSkew: 300,
  };
  const bearerStrategy = new BearerStrategy(
    azureAdTokenOptions,
    function (req, token, done) {
      writeLog("verifying the user...");
      writeLog(`${JSON.stringify(token)} was the token retrieved`, {
        level: "debug",
        stdout: true,
      });

      // @ts-expect-error
      return done(null, token.preferred_username, token);
    },
  );
  passport.use(bearerStrategy);
  app.use(passport.initialize());

  app.post(
    gqlUrlPath,
    passport.authenticate("oauth-bearer", { session: false }),
  );

  /**@step generate graphql schema */
  const schema = await schemaGenerator({
    federated: false,
  });

  /**@step graphql server setup */
  const server = new ApolloServer({
    schema,
    logger,
    context: ({ req }) => {
      return { user: req.user };
    },
  });

  server.applyMiddleware({ app });

  /**@step run the server */
  app.listen({ port: serverPort }, () =>
    writeLog(
      `Server ready at http://localhost:${serverPort}${server.graphqlPath}`,
      { stdout: true, level: "info" },
    ),
  );
}

main().catch((err: Error) => {
  writeLog(err, { level: "error", stdout: true });
});
